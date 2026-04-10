const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Função para adicionar uma mensagem na tela
function adicionarMensagem(texto, remetente) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', remetente);
    messageDiv.textContent = texto;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Rola para a última mensagem
}

// Função para enviar a mensagem para o backend
async function enviarMensagem() {
    const mensagem = userInput.value.trim();
    if (!mensagem) return;

    // Mostra a mensagem do usuário na tela
    adicionarMensagem(mensagem, 'user');
    userInput.value = '';

    // Mostra um indicador de "digitando..."
    const typingDiv = document.createElement('div');
    typingDiv.classList.add('message', 'agent');
    typingDiv.textContent = 'Pensando...';
    typingDiv.id = 'typing-indicator';
    chatBox.appendChild(typingDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // Envia a requisição para o backend
        const response = await fetch('/api/agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mensagem: mensagem })
        });

        const data = await response.json();

        // Remove o indicador de "digitando..."
        document.getElementById('typing-indicator')?.remove();

        if (response.ok) {
            // Mostra a resposta do sistema (Orquestrador ou resultado da ferramenta)
            adicionarMensagem(data.resposta, 'agent');
        } else {
            adicionarMensagem(`Erro: ${data.error}`, 'system');
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        document.getElementById('typing-indicator')?.remove();
        adicionarMensagem('Erro de conexão com o servidor.', 'system');
    }
}

// Event Listeners
sendButton.addEventListener('click', enviarMensagem);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        enviarMensagem();
    }
});