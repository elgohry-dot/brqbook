import fs from 'fs';

const botFile = 'server/telegramBot.ts';
let code = fs.readFileSync(botFile, 'utf8');

const oldEdit = `      const data = await res.json();
      if (!data.ok) {
        // Fallback to sending a new message if editing is not possible
        return await this.sendTelegramMessage(chatId, text, replyMarkup);
      }
      return data;
    } catch (err: any) {
      console.error('Failed to edit Telegram message:', err);
      return await this.sendTelegramMessage(chatId, text, replyMarkup);
    }`;

const newEdit = `      const data = await res.json();
      if (!data.ok) {
        this.addLog({
          type: 'telegram_api',
          direction: 'outbound',
          status: 'error',
          statusCode: data.error_code || 400,
          endpoint: 'editMessageText',
          summary: 'خطأ أثناء تعديل الرسالة، سيتم إرسال رسالة جديدة كبديل',
          details: data.description || 'Unknown error',
        });
        // Fallback to sending a new message if editing is not possible
        return await this.sendTelegramMessage(chatId, text, replyMarkup);
      }
      
      this.addLog({
        type: 'send_message',
        direction: 'outbound',
        status: 'success',
        statusCode: 200,
        endpoint: 'editMessageText',
        summary: 'تم تعديل رسالة تفاعلية بنجاح (شات ID: ' + chatId + ')',
        details: text.substring(0, 100) + '...',
      });
      return data;
    } catch (err: any) {
      console.error('Failed to edit Telegram message:', err);
      return await this.sendTelegramMessage(chatId, text, replyMarkup);
    }`;

if(code.includes('// Fallback to sending a new message if editing is not possible')) {
  code = code.replace(oldEdit, newEdit);
  fs.writeFileSync(botFile, code);
  console.log('Patched edit log');
} else {
  console.log('Could not find replace target');
}
