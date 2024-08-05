// server/server.js
import express from "express";
import formidable from "formidable";
import fs from "fs";
import cors from "cors";
import { Dropbox } from "dropbox";
import fetch from "node-fetch";

const app = express();
app.use(cors());

// Substitua com o Access Token obtido manualmente
const ACCESS_TOKEN = "sl.B6bTfacbVRfwVu_RxkR9GBcwAOcprTtIkKhsYXyGaSHWwOEXxn90jsExHKUe4KaY7BjG9VQGahFiMELRN8i7xyA9SS_Mo1wv6iB72T6GnzVuUVKjo4uokYPMqhT6baXGKdq-rqwdMe98uvjNILHdkJc"; // Insira o Access Token gerado

const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch });

app.post("/api/upload", (req, res) => {
  const form = new formidable.IncomingForm();
  form.uploadDir = "./uploads"; // Diretório para salvar arquivos
  form.keepExtensions = true; // Manter extensões dos arquivos

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("Erro ao processar upload:", err);
      return res.status(500).send("Erro ao enviar arquivos.");
    }

    const clientName = fields.clientName || "Cliente";

    try {
      // Iterar sobre os arquivos e enviá-los para o Dropbox
      for (const fileKey in files) {
        const file = files[fileKey];
        const oldPath = file.filepath;
        const newPath = `./uploads/${file.originalFilename}`;

        // Renomear e mover o arquivo para o diretório de destino
        fs.renameSync(oldPath, newPath);

        // Ler o conteúdo do arquivo
        const fileContent = fs.readFileSync(newPath);

        // Upload para o Dropbox
        const response = await dbx.filesUpload({
          path: `/${clientName}/${file.originalFilename}`,
          contents: fileContent,
        });

        console.log("Uploaded:", response);

        // Remover o arquivo do servidor após o upload
        fs.unlinkSync(newPath);
      }

      res.status(200).send("Arquivos enviados com sucesso!");
    } catch (error) {
      console.error("Erro ao enviar arquivos:", error);
      res.status(500).send("Erro ao enviar arquivos.");
    }
  });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
