// api/agent.js
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// 1. Configuração da API da OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// 2. Definição das "Ferramentas" (Funções que os agentes podem usar)
// Cada ferramenta tem um nome, uma descrição e parâmetros que espera receber.
const ferramentas = [
    // Ferramenta do Orquestrador
    {
        type: 'function',
        function: {
            name: 'delegar_tarefa',
            description: 'Delega uma tarefa para um agente especialista (marketing, coder, designer).',
            parameters: {
                type: 'object',
                properties: {
                    agente: {
                        type: 'string',
                        description: 'O nome do agente para delegar a tarefa (marketing, coder, designer).',
                        enum: ['marketing', 'coder', 'designer']
                    },
                    tarefa: {
                        type: 'string',
                        description: 'A tarefa específica para o agente executar.'
                    }
                },
                required: ['agente', 'tarefa']
            }
        }
    },
    // Ferramenta do Marketing
    {
        type: 'function',
        function: {
            name: 'gerar_copy',
            description: 'Gera um texto de marketing (copy) para um produto ou serviço.',
            parameters: {
                type: 'object',
                properties: {
                    produto: { type: 'string', description: 'O produto ou serviço a ser promovido.' },
                    publico_alvo: { type: 'string', description: 'O público-alvo da campanha.' }
                },
                required: ['produto']
            }
        }
    },
    // Ferramenta do Coder
    {
        type: 'function',
        function: {
            name: 'gerar_codigo',
            description: 'Gera código JavaScript, HTML ou CSS com base em uma descrição.',
            parameters: {
                type: 'object',
                properties: {
                    descricao: { type: 'string', description: 'Descrição do que o código deve fazer.' },
                    linguagem: { type: 'string', description: 'Linguagem de programação (javascript, html, css).', enum: ['javascript', 'html', 'css'] }
                },
                required: ['descricao']
            }
        }
    },
    // Ferramenta do Designer
    {
        type: 'function',
        function: {
            name: 'sugerir_design',
            description: 'Sugere um esquema de cores ou estilo de design para um elemento.',
            parameters: {
                type: 'object',
                properties: {
                    elemento: { type: 'string', description: 'O elemento a ser estilizado (ex: botão, site, logo).' },
                    estilo: { type: 'string', description: 'O estilo desejado (ex: moderno, minimalista, colorido).' }
                },
                required: ['elemento']
            }
        }
    }
];

// 3. Definição dos Agentes (Prompts do Sistema)
// Cada prompt descreve o papel, responsabilidades e ferramentas do agente.
const promptsDosAgentes = {
    orquestrador: `Você é um Orquestrador de Agentes, um gerente de projetos de IA. Seu papel é analisar o pedido do usuário e delegar a tarefa ao agente especialista mais adequado (Marketing, Coder ou Designer). Use a função 'delegar_tarefa' para isso. Seja sempre conciso e estratégico.`,

    marketing: `Você é um Agente de Marketing especialista. Sua função é criar textos persuasivos, slogans e estratégias de comunicação. Quando receber uma tarefa, use a função 'gerar_copy' para produzir o conteúdo solicitado. Seja criativo e foque no público-alvo.`,

    coder: `Você é um Agente Programador (Coder) sênior. Sua especialidade é escrever código limpo e funcional. Quando receber uma tarefa de programação, use a função 'gerar_codigo' para gerar o código na linguagem solicitada (JavaScript, HTML ou CSS). Forneça apenas o código e uma breve explicação.`,

    designer: `Você é um Agente Designer. Sua função é dar conselhos sobre design, cores, tipografia e experiência do usuário. Quando solicitado, use a função 'sugerir_design' para recomendar paletas de cores ou estilos. Seja criativo e justifique suas escolhas.`
};

// Função que executa a ferramenta solicitada pela IA
async function executarFerramenta(nomeDaFuncao, argumentos) {
    console.log(`🔧 Executando ferramenta: ${nomeDaFuncao} com args:`, argumentos);
    switch (nomeDaFuncao) {
        case 'delegar_tarefa':
            const { agente, tarefa } = JSON.parse(argumentos);
            console.log(`🤖 Delegando para o agente: ${agente}`);
            // Aqui você pode adicionar a lógica para realmente chamar o agente especialista.
            // Por enquanto, vamos simular o retorno.
            return JSON.stringify({ status: 'delegado', agente, tarefa });

        case 'gerar_copy':
            const { produto, publico_alvo } = JSON.parse(argumentos);
            // Em uma aplicação real, você chamaria a API da OpenAI aqui, passando o prompt específico do agente de marketing.
            return JSON.stringify({ copy: `Aqui está um texto de marketing criativo para ${produto} focado em ${publico_alvo || 'um público geral'}.` });

        case 'gerar_codigo':
            const { descricao, linguagem } = JSON.parse(argumentos);
            // Aqui você chamaria a API da OpenAI com o prompt do agente coder.
            return JSON.stringify({ codigo: `// Código ${linguagem} para: ${descricao}\nconsole.log("Olá mundo!");` });

        case 'sugerir_design':
            const { elemento, estilo } = JSON.parse(argumentos);
            // Aqui você chamaria a API da OpenAI com o prompt do agente designer.
            return JSON.stringify({ sugestao: `Para um ${elemento} com estilo ${estilo || 'moderno'}, sugiro uma paleta de cores com tons pastéis e uma tipografia sans-serif.` });

        default:
            throw new Error(`Função desconhecida: ${nomeDaFuncao}`);
    }
}

// 4. O Ponto de Entrada Principal (Handler da Função Serverless)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido. Use POST.' });
    }

    const { mensagem } = req.body;
    if (!mensagem) {
        return res.status(400).json({ error: 'O campo "mensagem" é obrigatório.' });
    }

    try {
        console.log(`💬 Mensagem recebida: ${mensagem}`);

        // Inicia a conversa com o Orquestrador
        let mensagens = [
            { role: 'system', content: promptsDosAgentes.orquestrador },
            { role: 'user', content: mensagem }
        ];

        // Loop para lidar com chamadas de função (function calling)
        while (true) {
            const resposta = await openai.chat.completions.create({
                model: 'gpt-4o-mini', // Ou 'gpt-4o' para tarefas mais complexas
                messages: mensagens,
                tools: ferramentas,
                tool_choice: 'auto', // A IA decide se usa uma ferramenta ou não
            });

            const mensagemResposta = resposta.choices[0].message;

            // Adiciona a resposta da IA ao histórico da conversa
            mensagens.push(mensagemResposta);

            // Se a IA não quiser chamar nenhuma ferramenta, terminamos o loop.
            if (!mensagemResposta.tool_calls) {
                return res.status(200).json({ resposta: mensagemResposta.content });
            }

            // Se a IA quiser chamar uma ferramenta, executamos cada uma delas.
            for (const toolCall of mensagemResposta.tool_calls) {
                const nomeDaFuncao = toolCall.function.name;
                const argumentosDaFuncao = toolCall.function.arguments;

                // Executa a ferramenta e obtém o resultado
                const resultadoDaFuncao = await executarFerramenta(nomeDaFuncao, argumentosDaFuncao);

                // Adiciona o resultado da ferramenta ao histórico da conversa
                mensagens.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: resultadoDaFuncao,
                });
            }
            // O loop continua, permitindo que a IA processe o resultado da ferramenta
            // e decida os próximos passos (ex: delegar para outro agente).
        }
    } catch (error) {
        console.error('Erro na API da OpenAI:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}