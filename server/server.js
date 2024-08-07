// server.js
import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import { Dropbox } from "dropbox";
import fetch from "node-fetch";
import formidable from "formidable";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid"; // Para gerar identificadores únicos
import cookieParser from "cookie-parser";
import csrf from "csurf";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(helmet()); // Adiciona segurança via cabeçalhos HTTP
app.use(cookieParser());

// Configuração de proteção CSRF
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

const ACCESS_TOKEN = process.env.DROPBOX_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("Erro: Access token do Dropbox não encontrado.");
  process.exit(1);
}

const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch });

// Cria o diretório 'uploads' se ele não existir
const uploadDir = `${__dirname}/uploads`;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log(`Diretório criado: ${uploadDir}`);
}

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post("/api/upload", csrfProtection, (req, res) => {
  const form = formidable({
    uploadDir,
    keepExtensions: true,
    multiples: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Erro ao processar upload:", err);
      return res.status(500).json({ error: "Erro ao processar o upload." });
    }

    const clientName = fields.clientName || "Cliente";

    try {
      for (const key in files) {
        const fileArray = Array.isArray(files[key]) ? files[key] : [files[key]];
        for (const file of fileArray) {
          const oldPath = file.filepath;
          const newFileName = `${uuidv4()}_${file.originalFilename}`; // Adiciona UUID ao nome do arquivo
          const newPath = `${uploadDir}/${newFileName}`;

          // Renomear e mover o arquivo para o diretório de destino
          fs.renameSync(oldPath, newPath);
          console.log(`Arquivo movido para: ${newPath}`);

          // Ler o conteúdo do arquivo
          const fileContent = fs.readFileSync(newPath);

          // Upload para o Dropbox com nome único
          const response = await dbx.filesUpload({
            path: `/${clientName}/${newFileName}`,
            contents: fileContent,
            mode: { '.tag': 'add' } // Tenta adicionar e falha se o arquivo já existe
          });

          console.log(`Arquivo enviado para Dropbox: ${response.result.path_display}`);

          // Remover o arquivo do servidor após o upload
          fs.unlinkSync(newPath);
          console.log(`Arquivo removido do servidor: ${newPath}`);
        }
      }

      let sharedLinkResponse;
      try {
        const links = await dbx.sharingListSharedLinks({
          path: `/${clientName}`,
          direct_only: true,
        });

        if (links.result.links.length > 0) {
          sharedLinkResponse = links.result.links[0];
          console.log("Link de compartilhamento existente encontrado:", sharedLinkResponse.url);
        } else {
          sharedLinkResponse = await dbx.sharingCreateSharedLinkWithSettings({
            path: `/${clientName}`,
            settings: {
              requested_visibility: "public",
            },
          });
          console.log("Link de compartilhamento criado:", sharedLinkResponse.result.url);
        }

        // Envia a resposta com o link de compartilhamento
        res.status(200).json({
          message: "Arquivos enviados com sucesso!",
          sharedLink: sharedLinkResponse.url || sharedLinkResponse.result.url,
        });
      } catch (sharingError) {
        console.error("Erro ao criar ou recuperar link de compartilhamento:", sharingError);
        res.status(500).send("Erro ao criar ou recuperar link de compartilhamento.");
      }
    } catch (error) {
      console.error("Erro ao enviar arquivos ou criar link de compartilhamento:", error);
      res.status(500).send("Erro ao enviar arquivos.");
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
