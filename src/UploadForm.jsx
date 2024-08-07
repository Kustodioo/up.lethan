// src/components/UploadForm.jsx
import React, { useState, useEffect } from "react";
import Clipboard from "clipboard";
import { appVersion } from "./config/version"; // Atualize o caminho para dentro de src

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
  const [uploadStatus, setUploadStatus] = useState(""); // Estado para notificações de status
  const [isUploading, setIsUploading] = useState(false); // Estado para o indicador de progresso
  const [csrfToken, setCsrfToken] = useState(""); // Estado para o token CSRF
  const [uploadProgress, setUploadProgress] = useState(0); // Estado para progresso do upload
  const [darkMode, setDarkMode] = useState(false); // Estado para o tema escuro/claro

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
    fetch("http://localhost:3000/csrf-token")
      .then((res) => res.json())
      .then((data) => {
        setCsrfToken(data.csrfToken);
      })
      .catch((err) => console.error("Erro ao buscar token CSRF:", err));
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("clientName", clientName);

    Object.entries(files).forEach(([key, file]) => {
      if (file) {
        if (Array.isArray(file)) {
          file.forEach((f, index) => {
            formData.append(
              "files",
              new File(
                [f],
                `${clientName}_${key}_${index + 1}.${f.name.split(".").pop()}`
              )
            );
          });
        } else {
          formData.append(
            "files",
            new File([file], `${clientName}_${key}.${file.name.split(".").pop()}`)
          );
        }
      }
    });

    try {
      setIsUploading(true); // Inicia o indicador de progresso
      setUploadStatus(""); // Reseta a mensagem de status anterior

      // Monitoramento de progresso usando XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://localhost:3000/api/upload", true);
      xhr.setRequestHeader("X-CSRF-Token", csrfToken);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentCompleted = Math.round(
            (event.loaded * 100) / event.total
          );
          setUploadProgress(percentCompleted);
        }
      };

      xhr.onload = () => {
        setIsUploading(false); // Finaliza o indicador de progresso
        if (xhr.status === 200) {
          const result = JSON.parse(xhr.responseText);
          setSharedLink(result.sharedLink);
          setUploadStatus("Arquivos enviados com sucesso!"); // Define a mensagem de sucesso
          setCopySuccess("");
        } else {
          throw new Error("Erro no envio do formulário");
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        setUploadStatus(
          "Falha ao enviar os arquivos. Por favor, tente novamente."
        ); // Define a mensagem de erro
      };

      xhr.send(formData);
    } catch (error) {
      console.error("Erro ao enviar arquivos:", error);
      setUploadStatus(
        "Falha ao enviar os arquivos. Por favor, tente novamente."
      ); // Define a mensagem de erro
      setIsUploading(false); // Finaliza o indicador de progresso em caso de erro
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
