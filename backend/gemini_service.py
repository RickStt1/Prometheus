import os
import json
import logging
from dotenv import load_dotenv
from pathlib import Path
from google import genai

load_dotenv(Path(__file__).parent / '.env')

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
logger = logging.getLogger(__name__)

if not GEMINI_API_KEY:
    logger.error("GEMINI_API_KEY não está configurada no arquivo .env")

client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None

async def generate_roadmap(goal: str, time_available: str, current_level: str) -> dict:
    """
    Gera um roadmap de estudos estruturado usando Gemini 1.5 Flash.
    """
    
    if not client:
        raise ValueError("GEMINI_API_KEY não está configurada")
    
    try:
        system_message = """Você é um especialista em criação de roadmaps de estudo personalizados.
    
Sua tarefa é criar um roadmap estruturado em JSON com base nas informações do usuário.
    
O JSON deve seguir EXATAMENTE este formato:
{
  "title": "Título do Roadmap",
  "description": "Descrição breve do roadmap",
  "modules": [
    {
      "id": "module-1",
      "title": "Nome do Módulo",
      "description": "Descrição do módulo",
      "topics": [
        {
          "id": "topic-1-1",
          "title": "Nome do Tópico",
          "description": "Descrição do tópico",
          "estimatedHours": 4
        }
      ]
    }
  ]
}
    
Crie entre 3-6 módulos, cada um com 3-8 tópicos. Seja específico e prático.
Retorne APENAS o JSON, sem markdown ou texto adicional."""
        
        user_prompt = f"""Crie um roadmap de estudos personalizado com as seguintes informações:

Objetivo: {goal}
Tempo Disponível: {time_available}
Nível Atual: {current_level}

Retorne apenas o JSON estruturado do roadmap."""
        
        # Combine system message com user prompt
        full_prompt = f"{system_message}\n\n{user_prompt}"
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        
        response_text = response.text.strip()
        
        # Remove markdown code blocks se presentes
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        elif response_text.startswith("```"):
            response_text = response_text[3:]
        
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Log para debug
        logger.info(f"Gemini response: {response_text[:200]}...")
        
        try:
            roadmap_data = json.loads(response_text)
            return roadmap_data
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}\n\nResponse: {response_text}")
            raise ValueError(f"Failed to parse Gemini response as JSON: {e}\n\nResponse: {response_text}")
            
    except Exception as e:
        logger.error(f"Error generating roadmap: {str(e)}")
        raise