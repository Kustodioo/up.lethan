// src/components/UploadForm.jsx

import React, { useState, useEffect } from "react";
import Clipboard from "clipboard";
import { appVersion } from "./config/version";

function UploadForm() {
  const [clientName, setClientName] = useState("");
  const [files, setFiles] = useState({
    cpf: null,
    cnh: null,
    rg: null,
    energyBill: null,
    phoneEmail: null,
    additionalDocs: [],
  });
  const [sharedLink, setSharedLink] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [darkMode, setDarkMode] = useState(false);

  // Define a URL do backend diretamente para o servidor em produção
  const backendUrl = 'http://57.129.43.169:3000/'; // Substitua este IP pelo seu IP ou domínio de produção

  useEffect(() => {
    const clipboard = new Clipboard(".copy-button", {
      text: () => sharedLink,
    });

    clipboard.on("success", () => {
      setCopySuccess("Link copiado com sucesso!");
    });

    clipboard.on("error", () => {
      setCopySuccess("Falha ao copiar o link.");
    });

    return () => clipboard.destroy();
  }, [sharedLink]);

  useEffect(() => {
    // Busca o token CSRF do servidor
    fetch('http://57.129.43.169:3000/csrf-token', {
      credentials: 'include'
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Error: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        setCsrfToken(data.csrfToken);
      })
      .catch((err) => console.error("Erro ao buscar token CSRF:", err));
  }, [backendUrl]);

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    setFiles((prevFiles) => ({
      ...prevFiles,
      [field]: file,
    }));
  };

  const handleAdditionalDocsChange = (e) => {
    const filesArray = Array.from(e.target.files);
    setFiles((prevFiles) => ({
      ...prevFiles,
      additionalDocs: filesArray,
    }));
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-theme", !darkMode);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('file', file);
  
    try {
      const response = await fetch('http://57.129.43.169:3000/api/upload', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error('Erro no envio do formulário');
      }
  
      const result = await response.json();
      console.log('Sucesso:', result);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <div className={`upload-container ${darkMode ? "dark-theme" : "light-theme"}`}>
      <div className="form-box">
        <img src="/logo.png" alt="Logo" className="logo" />
        <button onClick={toggleTheme}>
          {darkMode ? "Modo Claro" : "Modo Escuro"}
        </button>
        <form onSubmit={handleSubmit}>
          <h1>Upload de Documentos</h1>
          <h2>Faça o upload dos documentos para análise</h2>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nome do Cliente"
            required
            aria-label="Nome do Cliente"
          />
          <div className="upload-group">
            <label>CPF:</label>
            <input type="file" onChange={(e) => handleFileChange(e, "cpf")} />
          </div>
          <div className="upload-group">
            <label>CNH:</label>
            <input type="file" onChange={(e) => handleFileChange(e, "cnh")} />
          </div>
          <div className="upload-group">
            <label>RG:</label>
            <input type="file" onChange={(e) => handleFileChange(e, "rg")} />
          </div>
          <div className="upload-group">
            <label>Conta de Energia:</label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, "energyBill")}
            />
          </div>
          <div className="upload-group">
            <label>Celular e E-mail:</label>
            <input
              type="file"
              onChange={(e) => handleFileChange(e, "phoneEmail")}
            />
          </div>
          <div className="upload-group">
            <label>Documentos Adicionais:</label>
            <input type="file" multiple onChange={handleAdditionalDocsChange} />
          </div>
          <button
            type="submit"
            disabled={isUploading}
            aria-label="Enviar Formulário"
          >
            {isUploading ? "Enviando..." : "Enviar"}
          </button>
          {isUploading && (
            <div className="progress-bar">
              <div
                className="progress"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
        </form>
        {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
        {sharedLink && (
          <div className="shared-link">
            <p>Link de compartilhamento:</p>
            <div className="link-container">
              <input type="text" value={sharedLink} readOnly className="link-text" />
              <button className="copy-button" aria-label="Copiar Link">Copiar</button>
            </div>
            {copySuccess && <p className="copy-success">{copySuccess}</p>}
          </div>
        )}
        {/* Exibindo a versão do aplicativo abaixo do formulário */}
        <p className="app-version">Versão do App: {appVersion}</p>
      </div>
    </div>
  );
}

export default UploadForm;
