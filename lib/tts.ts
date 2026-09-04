import * as sdk from "microsoft-cognitiveservices-speech-sdk";

export interface SynthesisResult {
  audioBuffer: Buffer;
  contentType: string;
  voice: string;
}

export const VOICE_MAP: Record<string, string> = {
  english: "en-US-JennyNeural",
  hindi: "hi-IN-SwaraNeural",
  hinglish: "en-IN-PrabhatNeural",
};

export function getVoiceForLanguage(language?: string): string {
  if (!language) return VOICE_MAP.english;
  const normalized = language.trim().toLowerCase();
  return VOICE_MAP[normalized] || VOICE_MAP.english;
}

export async function synthesizeSpeech(
  text: string,
  language = "English"
): Promise<SynthesisResult> {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!apiKey || !region) {
    throw new Error("Missing Azure Speech credentials on server.");
  }

  const voiceName = getVoiceForLanguage(language);

  return new Promise<SynthesisResult>((resolve, reject) => {
    try {
      const speechConfig = sdk.SpeechConfig.fromSubscription(apiKey, region);
      speechConfig.speechSynthesisVoiceName = voiceName;
      speechConfig.speechSynthesisOutputFormat =
        sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

      synthesizer.speakTextAsync(
        text,
        (result) => {
          try {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              const buffer = Buffer.from(result.audioData);
              synthesizer.close();
              resolve({
                audioBuffer: buffer,
                contentType: "audio/mpeg",
                voice: voiceName,
              });
            } else {
              const details = result.errorDetails || "Unknown synthesis failure";
              synthesizer.close();
              reject(new Error(`Azure speech synthesis failed: ${details}`));
            }
          } catch (err) {
            synthesizer.close();
            reject(err);
          }
        },
        (error) => {
          synthesizer.close();
          reject(new Error(`Azure speech synthesis error: ${error}`));
        }
      );
    } catch (err) {
      reject(err);
    }
  });
}
