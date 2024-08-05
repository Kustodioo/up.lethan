// src/components/UploadForm.jsx
import { useState } from "react";

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("clientName", clientName);

    // Renomear e adicionar arquivos ao FormData
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
      const response = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Erro no envio do formulário");
      }

      const result = await response.json();
      console.log("Response text:", result);

      alert("Arquivos enviados com sucesso!");
      setSharedLink(result.sharedLink); // Armazena o link compartilhado no estado
      setCopySuccess(""); // Limpa a mensagem de sucesso ao obter novo link
    } catch (error) {
      console.error("Erro ao enviar arquivos:", error);
      alert("Falha ao enviar os arquivos. Por favor, tente novamente.");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sharedLink)
      .then(() => setCopySuccess("Link copiado com sucesso!"))
      .catch((err) => console.error("Erro ao copiar o link:", err));
  };

  return (
    <div className="upload-container">
      <div className="form-box">
        <img src="/logo.png" alt="Logo" className="logo" />
        <form onSubmit={handleSubmit}>
          <h1>Upload de Documentos</h1>
          <h2>Faça o upload dos documentos para análise</h2>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Nome do Cliente"
            required
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
            <input type="file" onChange={(e) => handleFileChange(e, "energyBill")} />
          </div>
          <div className="upload-group">
            <label>Celular e E-mail:</label>
            <input type="file" onChange={(e) => handleFileChange(e, "phoneEmail")} />
          </div>
          <div className="upload-group">
            <label>Documentos Adicionais:</label>
            <input type="file" multiple onChange={handleAdditionalDocsChange} />
          </div>
          <button type="submit">Enviar</button>
        </form>
        {sharedLink && (
          <div className="shared-link">
            <input type="text" value={sharedLink} readOnly className="link-text" />
            <button onClick={handleCopyLink} className="copy-button">Copiar</button>
            {copySuccess && <p className="copy-success">{copySuccess}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadForm;
