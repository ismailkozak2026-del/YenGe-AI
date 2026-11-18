import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type, type FunctionDeclaration } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '35mb' }));

// Ensure API responses are never cached by proxies/browsers and handle CORS preflight cleanly
app.use('/api', (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Shared Gemini client utility that dynamically reads process.env.GEMINI_API_KEY
function getGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Function Calling Declaration: make_phone_call
const makePhoneCallDeclaration: FunctionDeclaration = {
  name: 'make_phone_call',
  description: 'Kullanıcı sesli veya yazılı olarak birini veya bir telefon numarasını aramanı istediğinde (örneğin "Annemi ara", "Ahmet\'i ara", "05551234567\'yi ara" gibi) bu fonksiyonu çağırarak arama işlemini başlatır. Düz metinle "Arıyorum" demek kesinlikle yasaktır; doğrudan bu fonksiyon çağrılmalı, aranacak kişi adı contact_name ve varsa/belirtildiyse telefon numarası phone_number değişkenine yazılmalıdır.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      contact_name: {
        type: Type.STRING,
        description: "Aranacak kişinin rehberdeki adı veya unvanı (örneğin: 'Annem', 'Ahmet', 'Mehmet Yılmaz', 'Babam', '05551234567')",
      },
      phone_number: {
        type: Type.STRING,
        description: "Kullanıcının belirttiği veya cümlede geçen gerçek telefon numarası (örneğin: '05551234567', '+905321234567'), numara yoksa boş bırakılabilir.",
      },
    },
    required: ['contact_name'],
  },
};

// Function Calling Declaration: generate_image
const generateImageDeclaration: FunctionDeclaration = {
  name: 'generate_image',
  description: 'Kullanıcı senden bir görsel, resim veya çizim yapmanı/oluşturmanı istediğinde (örneğin "kedi resmi çiz", "gün batımı resmi yap", "araba görseli üret", "logo tasarımı yap" gibi) bu fonksiyonu çağırarak görsel üretimini başlatır. Prompt kısmına görselin detaylı ve sanatsal betimlemesi yazılmalıdır.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: 'Oluşturulacak görselin detaylı açıklaması ve stil detayları (örneğin: "A cute fluffy kitten sleeping in a cozy basket with sunlight, photorealistic, 8k")',
      },
      aspect_ratio: {
        type: Type.STRING,
        description: 'Görselin en-boy oranı: "1:1", "16:9", "9:16", "4:3", "3:4". Varsayılan "1:1"',
      },
      style: {
        type: Type.STRING,
        description: 'Sanatsal tarz: "photorealistic", "digital-art", "anime", "3d-render", "oil-painting", "cyberpunk"',
      },
    },
    required: ['prompt'],
  },
};

// Mode-specific persona instructions
const CORE_CONCISE_RULE = `
[TEMEL DİREKTİF: MAKSİMUM DOĞRULUK VE YÜKSEK HIZ]:
1. DOĞRULUK VE GERÇEKLİK (EN BİRİNCİL ÖNCELİK):
   - Her zaman %100 olgusal, bilimsel, mantıksal ve teknik olarak DOĞRU yanıtlar üret.
   - Bilmediğin, doğruluğundan emin olmadığın veya spekülatif konularda tahmin yürütmek yerine net ve dürüst ol. Asla bilgi uydurma (halüsinasyondan kesinlikle kaçın).
   - Matematiksel hesaplamalarda, kodlamada, tarihlerde ve teknik konularda adımları sağlam kur, kesin ve hatasız sonuç ver.
2. HIZ, NETLİK VE AKICILIK:
   - Dolaysız ve hedefe yönelik ol. Girişteki basmakalıp laf kalabalığını ("Tabii ki yardımcı olurum", "Harika bir soru") ve gereksiz kapanışları atla.
   - Açıklamayı en can alıcı noktalarla, kompakt ve okunabilir biçimde sun.
3. NİHAİ KESİN CEVAP:
   - Her yanıtın sonunda konunun en net, kesin ve dolaysız sonucunu belirt:
---
**🎯 Net Cevap:** [Sorunun en doğru, kesin ve doğrudan nihai sonucu]

[SESLİ ASİSTAN VE GERÇEK TELEFON ARAMASI KURALI]:
Sen sesli bir asistansın. Kullanıcı "Annemi ara", "Ahmet'i ara", "Babamı ara" veya bir telefon numarasını aramanı istediğinde KESİNLİKLE düz metinle "Arıyorum" deme!
Bunun yerine MUTLAKA 'make_phone_call' fonksiyonunu çağır; aranacak kişinin adını 'contact_name' değişkenine ve belirtildiyse telefon numarasını 'phone_number' değişkenine yaz.

[GÖRSEL VE RESİM OLUŞTURMA KURALI]:
Kullanıcı senden bir görsel, resim veya çizim oluşturmanı/çizmeni istediğinde (örneğin "resim çiz", "görsel oluştur", "şunun resmini yap"):
MUTLAKA 'generate_image' fonksiyonunu çağır! 'prompt' parametresine görselin detaylı, zengin ve estetik bir sanatsal betimlemesini yaz (Türkçe veya İngilizce). Yanıt metninde görseli oluşturduğunu kısaca söyle.`;

const PERSONA_PROMPTS: Record<string, string> = {
  general: `Sen "YenGeç" (YenGeç AI) adlı, son derece zeki, hızlı, esprili, analitik ve engelleri aşan ("Yen ve Geç") yeni nesil bir yapay zekasın.
Kullanıcı ile doğal, akıcı, zengin, samimi ve Türkçe dil kurallarına %100 uygun bir Türkçe ile iletişim kurarsın.
Her yanıtında yüksek doğruluk ve sürat esastır. Cevaplarını net tut, uzatmadan hedefe odaklan.`,

  code: `Sen "YenGeç Kod Mimarı" - kıdemli yazılım mühendisi ve sistem mimarısın.
Kodu modern standartlarda, güvenli, temiz ve hatasız yaz. Açıklamayı kısa tut, doğrudan çalışan kod bloğunu ve kritik mimari detayları ver.`,

  creative: `Sen "YenGeç Yaratıcı Stüdyo" - usta bir yaratıcı yazar ve metin stratejistisin.
Vurucu, özlü, ritmik ve etkileyici metinler üret. Uzatmadan en etkili kancayı ve doğru tonlamayı sun.`,

  analyst: `Sen "YenGeç Veri & Strateji" - kıdemli veri analisti ve yönetim danışmanısın.
Veriye, doğruluğa ve sonuca odaklan. Maddeler halinde doğrudan içgörüyü, sayısal gerçekleri ve eylem planını söyle.`,

  academic: `Sen "YenGeç Akademi" - Feynman tekniği ile sadeleştirme uzmanısın.
Kavramları en doğru bilimsel temellerle ve en anlaşılır benzetmeyle anlat, uzatmadan özünü kavrat.`,

  vision: `Sen "YenGeç Görsel & Tasarım" - görsel ve tasarım analisti yapay zekasın.
Görseldeki kritik noktaları, renk/yerleşim hatalarını ve tespitleri doğru ve kısa maddelerle listele.`
};

function formatGeminiError(error: any): string {
  const msg = error?.message || String(error || '');
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
    return 'Google Gemini API istek kotası geçici olarak aşıldı (429 Rate Limit). Sistem birkaç saniye içinde normale dönecektir.';
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('overloaded')) {
    return 'Google Gemini sunucularında geçici yoğunluk (503) yaşanıyor. Lütfen birkaç saniye sonra tekrar deneyin.';
  }
  return error?.message || 'Yapay zeka modeline şu anda ulaşılamıyor.';
}

// API: Health Check and Status
app.get('/api/health', async (_req, res) => {
  try {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      status: 'ok',
      hasApiKey: hasKey,
      timestamp: Date.now(),
      primaryModel: 'gemini-3.5-flash-lite',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Refresh environment variables and verify Gemini API connectivity
app.post('/api/refresh', async (_req, res) => {
  try {
    dotenv.config({ override: true });
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY ortam değişkeni bulunamadı.',
      });
    }

    const client = getGeminiClient();
    const testCandidateModels = [
      'gemini-4-hydrogen',
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest'
    ];
    let testRes: any = null;
    let activeModelName = 'gemini-4-hydrogen';
    let lastErr: any = null;

    for (const m of testCandidateModels) {
      try {
        testRes = await client.models.generateContent({
          model: m,
          contents: 'Ping: Durum kontrolü. Tek kelimeyle "Aktif" de.',
        });
        activeModelName = m;
        break;
      } catch (err: any) {
        lastErr = err;
      }
    }

    if (!testRes) {
      throw lastErr || new Error('Modellere ulaşılamadı.');
    }

    res.json({
      success: true,
      message: 'Gemini API bağlantısı ve ortam değişkenleri başarıyla yenilendi.',
      activeModel: activeModelName,
      status: 'online',
      testResponse: testRes.text?.trim() || 'Aktif',
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('API refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'API yenilenirken bir hata oluştu.',
    });
  }
});

// API: Chat endpoint with Streaming SSE or Non-streaming JSON
app.post('/api/chat', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY ortam değişkeni tanımlı değil. Lütfen Settings > Secrets panelinden API anahtarını kontrol edin.',
      });
    }

    const ai = getGeminiClient();

    const {
      messages = [],
      mode = 'general',
      systemInstruction: userCustomInstruction,
      thinkingLevel = 'LOW',
      enableSearch = false,
      stream = true,
    } = req.body;

    const basePersona = PERSONA_PROMPTS[mode] || PERSONA_PROMPTS.general;
    const finalSystemInstruction = `${basePersona}\n\n${CORE_CONCISE_RULE}${
      userCustomInstruction ? `\n\nEk Kullanıcı Yönergeleri:\n${userCustomInstruction}` : ''
    }`;

    // Optimize context window: maintain the last 20 messages for maximum accuracy and low latency
    const recentMessages = messages.length > 20 ? messages.slice(-20) : messages;

    // Convert messages to GenAI contents format
    const contents = recentMessages.map((m: any) => {
      const role = m.role === 'model' || m.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];

      // Add image parts if provided
      if (m.images && Array.isArray(m.images)) {
        for (const img of m.images) {
          if (img.data && img.mimeType) {
            parts.push({
              inlineData: {
                data: img.data,
                mimeType: img.mimeType,
              },
            });
          }
        }
      }

      // Add text part
      if (m.text) {
        parts.push({ text: m.text });
      }

      return {
        role,
        parts: parts.length > 0 ? parts : [{ text: '...' }],
      };
    });

    if (contents.length === 0) {
      return res.status(400).json({ error: 'Mesaj listesi boş olamaz.' });
    }

    // High availability candidate models
    const candidateModels =
      thinkingLevel === 'HIGH'
        ? [
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
            'gemini-4-hydrogen',
            'gemini-3.7-flash',
            'gemini-3.8-flash',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest',
          ]
        : [
            'gemini-3.5-flash-lite',
            'gemini-4-hydrogen',
            'gemini-3.6-flash',
            'gemini-3.8-flash',
            'gemini-3.7-flash',
            'gemini-3.1-flash-lite',
            'gemini-flash-latest',
          ];

    // Calibrated temperature (only for models that accept sampling parameters)
    const calculatedTemperature = mode === 'creative' ? 0.7 : 0.25;

    const buildModelConfig = (modelName: string, useSearch: boolean): any => {
      const config: any = {
        systemInstruction: finalSystemInstruction,
      };

      // Do not pass deprecated sampling parameters (temperature) to gemini-4-* or gemini-3.8-flash
      if (!modelName.startsWith('gemini-4-') && modelName !== 'gemini-3.8-flash') {
        config.temperature = calculatedTemperature;
      }

      // Apply thinkingConfig only for Gemini 3 / Gemini 4 models that support it
      if (
        modelName.startsWith('gemini-4-') ||
        modelName === 'gemini-3.8-flash' ||
        modelName === 'gemini-3.1-flash-lite'
      ) {
        config.thinkingConfig = {
          thinkingLevel: thinkingLevel === 'HIGH' ? ThinkingLevel.HIGH : ThinkingLevel.LOW,
        };
      }

      // Use clean Google Search tool when search is active to avoid hybrid tool 429/400 failures,
      // otherwise provide functionDeclarations for calling & image generation
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      } else {
        config.tools = [{ functionDeclarations: [makePhoneCallDeclaration, generateImageDeclaration] }];
      }

      return config;
    };

    let clientClosed = false;
    res.on('close', () => {
      if (!res.writableEnded) {
        clientClosed = true;
      }
    });

    if (stream) {
      let streamStarted = false;
      let lastError: any = null;

      // Try with requested enableSearch first; if search grounding hits quota/rate limit, fall back without search
      const searchPasses = enableSearch ? [true, false] : [false];

      for (const useSearch of searchPasses) {
        for (const modelName of candidateModels) {
          if (clientClosed) {
            if (!res.writableEnded) res.end();
            return;
          }

          try {
            const modelConfig = buildModelConfig(modelName, useSearch);

            const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents,
              config: modelConfig,
            });

            let fullText = '';
            let searchSources: any[] = [];
            let detectedFunctionCall: any = null;

            for await (const chunk of responseStream) {
              if (clientClosed) break;

              // Check for functionCalls on chunk
              const calls = chunk.functionCalls;
              if (calls && calls.length > 0) {
                for (const call of calls) {
                  if (call.name === 'make_phone_call' || call.name === 'generate_image') {
                    detectedFunctionCall = {
                      name: call.name,
                      args: call.args || {},
                    };
                  }
                }
              } else {
                const parts = (chunk as any).candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                  if (
                    part.functionCall &&
                    (part.functionCall.name === 'make_phone_call' ||
                      part.functionCall.name === 'generate_image')
                  ) {
                    detectedFunctionCall = {
                      name: part.functionCall.name,
                      args: part.functionCall.args || {},
                    };
                  }
                }
              }

              const text = chunk.text || '';
              if (text) {
                if (!streamStarted) {
                  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
                  res.setHeader('Cache-Control', 'no-cache, no-transform');
                  res.setHeader('X-Accel-Buffering', 'no');
                  res.flushHeaders?.();
                  streamStarted = true;
                }
                fullText += text;
                if (!clientClosed && !res.writableEnded) {
                  res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
                  (res as any).flush?.();
                }
              }

              // Collect grounding metadata if search was used
              const candidates = (chunk as any).candidates;
              if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                searchSources = candidates[0].groundingMetadata.groundingChunks;
              }
            }

            if (clientClosed) {
              if (!res.writableEnded) res.end();
              return;
            }

            // If model finished with completely empty output and no function call before any stream output, try next model
            if (!fullText.trim() && !detectedFunctionCall && !streamStarted) {
              console.warn(`[Chat Stream Model ${modelName}] Empty output, trying next model.`);
              continue;
            }

            if (!streamStarted) {
              res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
              res.setHeader('Cache-Control', 'no-cache, no-transform');
              res.setHeader('X-Accel-Buffering', 'no');
              res.flushHeaders?.();
              streamStarted = true;
            }

            if (!res.writableEnded) {
              res.write(
                `data: ${JSON.stringify({
                  done: true,
                  fullText,
                  functionCall: detectedFunctionCall,
                  searchSources,
                })}\n\n`
              );
              (res as any).flush?.();
              res.end();
            }
            return;
          } catch (err: any) {
            lastError = err;
            console.error(`[Chat Stream Model ${modelName} (search=${useSearch}) Error]:`, err?.status, err?.message);
            if (streamStarted) {
              if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify({ error: formatGeminiError(err) })}\n\n`);
                res.end();
              }
              return;
            }
            const isBusy =
              err?.status === 429 ||
              err?.status === 503 ||
              String(err?.message || '').includes('429') ||
              String(err?.message || '').includes('503');
            if (isBusy) {
              await new Promise((resolve) => setTimeout(resolve, 350));
            }
          }
        }
      }

      throw lastError || new Error('Yapay zeka modellerine şu anda ulaşılamıyor.');
    } else {
      let lastError: any = null;
      const searchPasses = enableSearch ? [true, false] : [false];

      for (const useSearch of searchPasses) {
        for (const modelName of candidateModels) {
          try {
            const modelConfig = buildModelConfig(modelName, useSearch);

            const response = await ai.models.generateContent({
              model: modelName,
              contents,
              config: modelConfig,
            });

            const text = response.text || '';
            const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks || [];

            let detectedFunctionCall: any = null;
            const calls = response.functionCalls;
            if (calls && calls.length > 0) {
              for (const call of calls) {
                if (call.name === 'make_phone_call' || call.name === 'generate_image') {
                  detectedFunctionCall = {
                    name: call.name,
                    args: call.args || {},
                  };
                }
              }
            } else {
              const parts = (response as any).candidates?.[0]?.content?.parts || [];
              for (const part of parts) {
                if (
                  part.functionCall &&
                  (part.functionCall.name === 'make_phone_call' ||
                    part.functionCall.name === 'generate_image')
                ) {
                  detectedFunctionCall = {
                    name: part.functionCall.name,
                    args: part.functionCall.args || {},
                  };
                }
              }
            }

            if (!text.trim() && !detectedFunctionCall) {
              console.warn(`[Chat Non-stream Model ${modelName}] Empty output, trying next model.`);
              continue;
            }

            return res.json({
              text,
              functionCall: detectedFunctionCall,
              searchSources: groundingChunks,
            });
          } catch (err: any) {
            lastError = err;
            console.error(`[Chat Non-stream Model ${modelName} (search=${useSearch}) Error]:`, err?.status, err?.message);
            const isBusy =
              err?.status === 429 ||
              err?.status === 503 ||
              String(err?.message || '').includes('429') ||
              String(err?.message || '').includes('503');
            if (isBusy) {
              await new Promise((resolve) => setTimeout(resolve, 350));
            }
          }
        }
      }

      throw lastError || new Error('Yapay zeka modellerine şu anda ulaşılamıyor.');
    }
  } catch (error: any) {
    const friendlyMsg = formatGeminiError(error);
    console.error('Gemini Chat API Error:', friendlyMsg, 'Raw status:', error?.status, 'Raw msg:', error?.message);
    if (!res.headersSent) {
      res.status(500).json({
        error: friendlyMsg,
      });
    } else {
      res.write(`data: ${JSON.stringify({ error: friendlyMsg })}\n\n`);
      res.end();
    }
  }
});

// API: Text-to-Speech (TTS) using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY eksik.' });
    }

    const { text, voiceName = 'Kore', style } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Seslendirilecek metin belirtilmelidir.' });
    }

    // Clean text and limit for prompt audio
    const cleanText = text
      .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
      .replace(/[*_#`~>\[\]\(\)]/g, ' ')
      .replace(/🎯/g, '')
      .replace(/---/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 600)
      .trim();

    const ai = getGeminiClient();
    const ttsCandidateModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];
    let base64Audio: string | null = null;
    let lastTtsError: any = null;

    for (const modelName of ttsCandidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: cleanText,
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
        if (base64Audio) break;
      } catch (err: any) {
        lastTtsError = err;
      }
    }

    if (!base64Audio) {
      throw lastTtsError || new Error('Ses verisi oluşturulamadı.');
    }

    res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    console.error('Gemini TTS Error:', error);
    res.status(500).json({
      error: error.message || 'Seslendirme işlemi sırasında bir hata oluştu.',
    });
  }
});

// API: AI Image Generation on demand
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'photorealistic' } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Görsel oluşturmak için bir prompt (açıklama) gereklidir.' });
    }

    let finalPrompt = prompt.trim();
    if (style && style !== 'none') {
      const stylePrompts: Record<string, string> = {
        'photorealistic': 'hyperrealistic, 8k resolution, highly detailed photography, realistic lighting, octane render, masterpiece',
        'digital-art': 'digital art illustration, trending on Artstation, highly detailed, vibrant atmospheric colors',
        'anime': 'anime aesthetic, Makoto Shinkai style, vibrant lighting, intricate details, clean line art',
        '3d-render': '3D Pixar and Blender style, smooth textures, isometric perspective, ray tracing, cute character lighting',
        'oil-painting': 'classic oil painting on textured canvas, expressive brushstrokes, rich pigment, museum quality',
        'cyberpunk': 'cyberpunk theme, neon lights, futuristic cityscape, dark atmospheric glow, cinematic',
      };
      if (stylePrompts[style]) {
        finalPrompt += `, ${stylePrompts[style]}`;
      }
    }

    // 1. Try Gemini Image Generation
    let geminiImageData: string | null = null;
    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = getGeminiClient();
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: finalPrompt,
          config: {
            imageConfig: {
              aspectRatio: (['1:1', '3:4', '4:3', '9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1') as any,
            },
          },
        });

        const parts = geminiRes.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          if (p.inlineData && p.inlineData.data) {
            const mime = p.inlineData.mimeType || 'image/png';
            geminiImageData = `data:${mime};base64,${p.inlineData.data}`;
            break;
          }
        }
      } catch (geminiErr: any) {
        console.warn('Gemini image generation notice (fallback to high-res engine):', geminiErr?.message || geminiErr);
      }
    }

    if (geminiImageData) {
      return res.json({
        success: true,
        imageUrl: geminiImageData,
        prompt,
        aspectRatio,
        style,
        model: 'gemini-3.1-flash-lite-image',
      });
    }

    // 2. High-Resolution AI Image Generation Engine (Pollinations / Flux)
    const dimensionsMap: Record<string, { w: number; h: number }> = {
      '1:1': { w: 1024, h: 1024 },
      '16:9': { w: 1280, h: 720 },
      '9:16': { w: 720, h: 1280 },
      '4:3': { w: 1024, h: 768 },
      '3:4': { w: 768, h: 1024 },
    };
    const { w, h } = dimensionsMap[aspectRatio] || { w: 1024, h: 1024 };
    const seed = Math.floor(Math.random() * 10000000);
    const encodedPrompt = encodeURIComponent(finalPrompt);
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true&enhance=true`;

    return res.json({
      success: true,
      imageUrl: generatedUrl,
      prompt,
      aspectRatio,
      style,
      model: 'YenGeç AI Image Engine',
    });
  } catch (error: any) {
    console.error('Image generation error:', error);
    res.status(500).json({ error: error.message || 'Görsel oluşturulurken bir hata oluştu.' });
  }
});

// API: Quick AI Tool actions
app.post('/api/tools/quick', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY eksik.' });
    }

    const { action, input, options = {} } = req.body;
    if (!input) {
      return res.status(400).json({ error: 'Girdi metni gereklidir.' });
    }

    let systemInstruction = 'Sen uzman bir yapay zeka asistanısın.';
    let prompt = input;

    switch (action) {
      case 'summarize':
        systemInstruction = 'Sen profesyonel bir özetleme uzmanısın. Metnin ana fikrini, kritik noktalarını ve eylem maddelerini net maddeler halinde özetle.';
        prompt = `Aşağıdaki metni kapsamlı ve net bir şekilde özetle:\n\n${input}`;
        break;

      case 'code-fix':
        systemInstruction = 'Sen kıdemli bir kod inceleme ve hata ayıklama uzmanısın. Koddaki hataları, güvenlik açıklarını ve performans iyileştirmelerini belirt, düzeltilmiş kod bloğunu ver.';
        prompt = `Aşağıdaki kodu analiz et, hataları tespit et ve düzeltilmiş halini açıkla:\n\n${input}`;
        break;

      case 'prompt-optimizer':
        systemInstruction = 'Sen dünya çapında tanınan bir Prompt Mühendisisin (Prompt Engineering). Kullanıcının basit fikrini alıp en yüksek kaliteli Gemini çıktısı üretecek profesyonel, bağlamlı ve rol odaklı bir prompt tasarla.';
        prompt = `Bu fikri profesyonel bir prompt'a dönüştür:\n"${input}"`;
        break;

      case 'translate':
        const targetLang = options.targetLang || 'Türkçe';
        systemInstruction = `Sen profesyonel bir edebi ve teknik çevirmensin. Anlamı, deyimleri ve kültürel bağlamı koruyarak en doğal ${targetLang} çeviriyi yap.`;
        prompt = `Aşağıdaki metni doğal ve akıcı bir şekilde ${targetLang} diline çevir:\n\n${input}`;
        break;

      case 'mindmap':
        systemInstruction = 'Sen görsel düşünce ve sistem hiyerarşisi uzmanısın. Konuyu ana başlıklar, alt başlıklar ve detaylar halinde hiyerarşik bir ağaç yapısı ve markdown listesi olarak sun.';
        prompt = `Bu konu için zengin bir akıl haritası / hiyerarşik plan hazırla:\n\n${input}`;
        break;

      case 'creative-expand':
        systemInstruction = 'Sen yaratıcı bir fikir genişletici ve beyin fırtınası ortağısın. Verilen fikri 5 farklı yenilikçi açıdan ele al, güçlü ve zayıf yönlerini belirt.';
        prompt = `Bu fikri yenilikçi açılardan genişlet:\n\n${input}`;
        break;

      default:
        prompt = input;
    }

    const ai = getGeminiClient();
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-4-hydrogen',
      'gemini-3.6-flash',
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
    ];
    let lastError: any = null;
    let resultText = '';

    for (const modelName of candidateModels) {
      try {
        const quickConfig: any = {
          systemInstruction,
        };
        if (!modelName.startsWith('gemini-4-') && modelName !== 'gemini-3.8-flash') {
          quickConfig.temperature = 0.5;
        }
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: quickConfig,
        });
        resultText = response.text || '';
        if (resultText) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!resultText && lastError) {
      throw lastError;
    }

    res.json({ result: resultText });
  } catch (error: any) {
    console.error('Quick tool error:', error);
    res.status(500).json({ error: error.message || 'Hızlı araç çalıştırılamadı.' });
  }
});

// Self-destructing Service Worker cleanup script so browsers with stale /dev-sw.js immediately clear caches & unregister
const SW_CLEANUP_SCRIPT = `
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => clients.forEach((c) => c.navigate(c.url)))
      .catch(() => {})
  );
});
`;

// Setup Vite middlewares in development or static serving in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  app.get('/dev-sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(SW_CLEANUP_SCRIPT);
  });

  app.get('/sw-yengec.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.resolve(__dirname, 'public', 'sw-yengec.js'));
  });

  app.get('/kontrol/sw-kontrol.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Service-Worker-Allowed', '/kontrol');
    res.sendFile(path.resolve(__dirname, 'public', 'kontrol', 'sw-kontrol.js'));
  });

  if (!isProduction) {
    app.get('/sw.js', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.send(SW_CLEANUP_SCRIPT);
    });

    const { createServer: createViteServer } = await import('vite');
    const fs = await import('fs/promises');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    const serveDevKontrol = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const kontrolPath = path.resolve(__dirname, 'kontrol.html');
        let template = await fs.readFile(kontrolPath, 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res
          .status(200)
          .set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
          .end(template);
      } catch (err) {
        next(err);
      }
    };

    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        (req.path === '/' ||
          req.path.endsWith('.html') ||
          req.path.startsWith('/src/') ||
          req.path.startsWith('/kontrol'))
      ) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      }
      next();
    });

    app.get('/', (req, res, next) => {
      if (req.query.app === 'kontrol') {
        return serveDevKontrol(req, res, next);
      }
      return next();
    });

    app.get(['/kontrol', '/kontrol/*'], (req, res, next) => {
      if (req.path.includes('.')) {
        return next();
      }
      return serveDevKontrol(req, res, next);
    });

    app.use(vite.middlewares);
  } else {
    app.get('/', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      if (req.query.app === 'kontrol') {
        return res.sendFile(path.resolve(__dirname, 'dist', 'kontrol.html'));
      }
      return res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });

    app.use(
      express.static(path.resolve(__dirname, 'dist'), {
        index: false,
        setHeaders: (res, filePath) => {
          if (
            filePath.endsWith('sw.js') ||
            filePath.endsWith('sw-yengec.js') ||
            filePath.endsWith('sw-kontrol.js') ||
            filePath.endsWith('registerSW.js') ||
            filePath.endsWith('index.html') ||
            filePath.endsWith('kontrol.html')
          ) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          }
        },
      })
    );
    app.get(['/kontrol', '/kontrol/*'], (req, res, next) => {
      if (req.path.includes('.')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.sendFile(path.resolve(__dirname, 'dist', 'kontrol.html'));
    });
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      if (req.query.app === 'kontrol') {
        return res.sendFile(path.resolve(__dirname, 'dist', 'kontrol.html'));
      }
      return res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 YenGeç Kontrol Merkezi Server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
