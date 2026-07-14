import { NewMessageEvent } from "telegram/events/index.js";
import axios from "axios";
import FormData from "form-data";
import { logToChannel } from "../index.js";

export default [
  {
    name: "OCR Reader",
    description: "Get OCR result for images. Use -n, -np, -ni, -nt flags to generate notes via Gemini.",
    command: "ocr",
    usage: ".ocr [-n|-np|-ni|-nt] [lang]",
    category: "Tools",
    handler: async (event: NewMessageEvent) => {
      const apiKey = process.env.OCR_SPACE_API_KEY;
      if (!apiKey) {
        await event.message.edit({
            text: "`Oops!! get the OCR API from` [HERE](https://ocr.space/OCRAPI) `& add it to your Environment Variables` (`OCR_SPACE_API_KEY`)"
        });
        return;
      }

      if (!event.message.replyToMsgId) {
        await event.message.edit({ text: "`I can't read nothing (°ー°〃)\nPlease reply to an image!`" });
        return;
      }

      const replyMsg = await event.message.getReplyMessage();
      if (!replyMsg?.media) {
        await event.message.edit({ text: "`Please reply to an image!`" });
        return;
      }

      const text = event.message.text || "";
      const args = text.split(" ").slice(1);
      
      let lang_code = "eng";
      let notesFormat: "none" | "t" | "p" | "i" = "none";

      for (const arg of args) {
          if (arg === "-n") notesFormat = "t";
          else if (arg === "-nt") notesFormat = "t";
          else if (arg === "-np") notesFormat = "p";
          else if (arg === "-ni") notesFormat = "i";
          else lang_code = arg;
      }

      await event.message.edit({ text: "`Trying to Read.. 📖`" });

      const buffer = await event.client?.downloadMedia(replyMsg, {});

      if (!buffer) {
        await event.message.edit({ text: "`Failed to download image!`" });
        return;
      }

      try {
        const form = new FormData();
        form.append("file", Buffer.from(buffer), { filename: "image.jpg" });
        form.append("apikey", apiKey);
        form.append("language", lang_code);
        form.append("isOverlayRequired", "false");

        const res = await axios.post("https://api.ocr.space/parse/image", form, {
          headers: form.getHeaders(),
        });

        if (res.data.IsErroredOnProcessing) {
            await event.message.edit({
                text: `\`Couldn't read it.. (╯‵□′)╯︵┻━┻\`\n\`I guess I need new glasses.. 👓\`\n\n**ERROR**: \`${res.data.ErrorMessage || "Unknown Error"}\``
            });
            return;
        }

        const parsedText = res.data.ParsedResults?.[0]?.ParsedText || "";
        
        if (!parsedText.trim()) {
            await event.message.edit({ text: "**Here's what I could read from it:**\n\n`No text found.`" });
            return;
        }

        if (notesFormat !== "none") {
            await event.message.edit({ text: "`Generating notes with Gemini... 🧠`" });
            
            let notesText = parsedText;
            try {
                const { GoogleGenAI } = await import("@google/genai");
                const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
                const prompt = "Please generate concise and structured notes from the following extracted text:\n\n" + parsedText;
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });
                if (response.text) {
                    notesText = response.text;
                }
            } catch (err: any) {
                await event.message.edit({ text: `**Failed to generate notes using Gemini:** \`${err.message}\`` });
                return;
            }

            const fs = await import("fs");
            const path = await import("path");
            const os = await import("os");

            if (notesFormat === "t") {
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
                const txtPath = path.join(tmpDir, "notes.txt");
                fs.writeFileSync(txtPath, notesText);
                
                await event.client?.sendFile(event.message.peerId!, {
                    file: txtPath,
                    caption: "**Here are your generated notes (Text).**",
                    replyTo: event.message.replyToMsgId || event.message.id
                });
                
                await event.message.delete({ revoke: true }).catch(() => {});
                fs.unlinkSync(txtPath);
                fs.rmdirSync(tmpDir);
            } else if (notesFormat === "p") {
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
                const pdfPath = path.join(tmpDir, "notes.pdf");
                
                const PDFDocument = (await import("pdfkit")).default;
                
                await new Promise<void>((resolve, reject) => {
                    const doc = new PDFDocument();
                    const stream = fs.createWriteStream(pdfPath);
                    doc.pipe(stream);
                    doc.fontSize(12).text(notesText, { align: 'left' });
                    doc.end();
                    stream.on('finish', resolve);
                    stream.on('error', reject);
                });
                
                await event.client?.sendFile(event.message.peerId!, {
                    file: pdfPath,
                    caption: "**Here are your generated notes (PDF).**",
                    replyTo: event.message.replyToMsgId || event.message.id
                });
                
                await event.message.delete({ revoke: true }).catch(() => {});
                fs.unlinkSync(pdfPath);
                fs.rmdirSync(tmpDir);
            } else if (notesFormat === "i") {
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "notes-"));
                const imgPath = path.join(tmpDir, "notes.png");
                
                const { generate } = await import("text-to-image");
                
                const dataUri = await generate(notesText, {
                    maxWidth: 800,
                    fontSize: 16,
                    fontFamily: "sans-serif",
                    lineHeight: 24,
                    margin: 20,
                    bgColor: "#ffffff",
                    textColor: "#000000"
                });
                const base64Data = dataUri.replace(/^data:image\/png;base64,/, "");
                fs.writeFileSync(imgPath, base64Data, "base64");
                
                await event.client?.sendFile(event.message.peerId!, {
                    file: imgPath,
                    caption: "**Here are your generated notes (Image).**",
                    replyTo: event.message.replyToMsgId || event.message.id
                });
                
                await event.message.delete({ revoke: true }).catch(() => {});
                fs.unlinkSync(imgPath);
                fs.rmdirSync(tmpDir);
            }
        } else {
            await event.message.edit({
                text: `**Here's what I could read from it:**\n\n\`${parsedText}\``
            });
        }
        
        await logToChannel("`ocr` command successfully executed");
      } catch (e: any) {
        await event.message.edit({
            text: `\`Couldn't read it.. (╯‵□′)╯︵┻━┻\`\n\`I guess I need new glasses.. 👓\`\n\n**ERROR**: \`${e.message}\``
        });
      }
    }
  }
];
