import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 4500;

// Configurar middlewares
app.use(cors());
app.use(express.json());

// Cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Endpoint de prueba
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bot-ayuda' });
});

// Endpoint de chat
app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Falta el campo message en el body.' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY no está configurada.' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini', // o el modelo que tengas disponible
      messages: [
        {
          role: 'system',
          content:
            'Eres un bot de ayuda para el sistema de gestión de personal. ' +
            'Respondes siempre en español, de forma clara y breve.',
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content || 'No pude generar una respuesta.';
    res.json({ reply });
  } catch (error) {
    console.error('Error en /chat:', error);
    res.status(500).json({ error: 'Error al procesar la respuesta del bot.' });
  }
});

app.listen(PORT, () => {
  console.log(`Bot de ayuda escuchando en el puerto ${PORT}`);
});