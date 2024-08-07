// server.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import cors from 'cors';
import helmet from 'helmet';
import { Dropbox } from 'dropbox';
import fetch from 'node-fetch';
import formidable from 'formidable';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import { renewAccessToken } from './tokenManager.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Configuração do CORS para permitir solicitações do frontend
app.use(cors({
  origin: [
    'https://up-lethan-frontend.onrender.com', // URL do frontend em produção
    'http://localhost:3001', // URL do frontend em desenvolvimento local
  ],
  credentials: true, // Permitir envio de cookies
  methods: ['GET', 'POST'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'], // Cabeçalhos permitidos
}));

app.use(helmet());
app.use(cookieParser());

const csrfProtection = csrf({ cookie: true });
app.use(csrfProtection);

let accessToken = process.env.DROPBOX_ACCESS_TOKEN;

app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/api/upload', csrfProtection, async (req, res) => {
  try {
    // Renove o token de acesso e crie uma nova instância de Dropbox
    accessToken = await renewAccessToken();
    const dbx = new Dropbox({ accessToken, fetch });

    const form = formidable({
      uploadDir: `${__dirname}/uploads`,
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
          const newPath = `${__dirname}/uploads/${newFileName}`;

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
