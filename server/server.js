import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import formidable from 'formidable';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import { renewAccessToken } from './tokenManager.js';
import csrf from 'csurf';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const uploadsDir = path.join(__dirname, 'uploads');

// Certifique-se de que o diretório de uploads existe
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do CORS
app.use(cors({
  origin: 'http://57.129.43.169:3001', // URL do seu frontend
  credentials: true,
}));

app.use(cookieParser());

// Configuração do middleware CSRF
const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

// Endpoint para obter o token CSRF
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Endpoint para upload de arquivos
app.post('/api/upload', csrfProtection, async (req, res) => {
  try {
    const accessToken = await renewAccessToken();
    const dbx = new Dropbox({ accessToken, fetch });

    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      multiples: true,
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Erro ao processar upload:', err);
        return res.status(500).json({ error: 'Erro ao processar o upload.' });
      }

      const clientName = fields.clientName || 'Cliente';

      for (const key in files) {
        const fileArray = Array.isArray(files[key]) ? files[key] : [files[key]];
        for (const file of fileArray) {
          const oldPath = file.filepath;
          const newFileName = `${uuidv4()}_${file.originalFilename}`;
          const newPath = path.join(uploadsDir, newFileName);

          fs.renameSync(oldPath, newPath);
          console.log(`Arquivo movido para: ${newPath}`);

          const fileContent = fs.readFileSync(newPath);

          const response = await dbx.filesUpload({
            path: `/${clientName}/${newFileName}`,
            contents: fileContent,
            mode: { '.tag': 'add' }
          });

          console.log(`Arquivo enviado para Dropbox: ${response.result.path_display}`);

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

        res.status(200).json({
          message: "Arquivos enviados com sucesso!",
          sharedLink: sharedLinkResponse.url || sharedLinkResponse.result.url,
        });
      } catch (sharingError) {
        console.error("Erro ao criar ou recuperar link de compartilhamento:", sharingError);
        res.status(500).send("Erro ao criar ou recuperar link de compartilhamento.");
      }
    });
  } catch (error) {
    console.error('Erro no upload ou renovação do token:', error);
    res.status(500).send('Erro no upload ou renovação do token.');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
