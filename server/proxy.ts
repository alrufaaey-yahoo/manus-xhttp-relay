import { IncomingMessage, ServerResponse } from 'http';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';

/**
 * مجموعة الترويسات التي يجب تصفيتها قبل إعادة التوجيه
 * هذه الترويسات حساسة وقد تسبب مشاكل في الاتصال أو الأمان
 */
const STRIP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'forwarded',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-forwarded-port',
]);

/**
 * معالج طلبات Proxy الرئيسي
 * يعيد توجيه جميع الطلبات الواردة إلى النطاق المستهدف
 */
export async function handleProxyRequest(req: IncomingMessage, res: ServerResponse) {
  const targetDomain = process.env.TARGET_DOMAIN;

  if (!targetDomain) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Misconfigured: TARGET_DOMAIN is not set');
    return;
  }

  try {
    // تحليل URL الطلب الواردة
    const parsedUrl = url.parse(req.url || '/');
    const targetUrl = targetDomain + (parsedUrl.path || '/');

    // تحليل URL المستهدفة للحصول على خيارات الاتصال
    const options: any = url.parse(targetUrl);
    options.method = req.method;
    options.headers = {};

    // استخراج عنوان IP الحقيقي للعميل
    let clientIp: string | null = null;

    // معالجة الترويسات الواردة
    for (const [k, v] of Object.entries(req.headers)) {
      const lowerK = k.toLowerCase();

      // تجاهل الترويسات الحساسة
      if (STRIP_HEADERS.has(lowerK)) continue;

      // تجاهل ترويسات Vercel
      if (lowerK.startsWith('x-vercel-')) continue;

      // استخراج عنوان IP الحقيقي من x-real-ip
      if (lowerK === 'x-real-ip') {
        clientIp = v as string;
        continue;
      }

      // استخراج عنوان IP من x-forwarded-for
      if (lowerK === 'x-forwarded-for') {
        if (!clientIp) {
          clientIp = (v as string).split(',')[0]?.trim() || null;
        }
        continue;
      }

      // نقل باقي الترويسات
      if (options.headers) {
        (options.headers as Record<string, any>)[k] = v;
      }
    }

    // إضافة عنوان IP الحقيقي للعميل إلى الترويسات
    if (clientIp) {
      (options.headers as Record<string, any>)['x-forwarded-for'] = clientIp;
    } else {
      // استخدام عنوان IP من الاتصال المباشر إذا لم يتم العثور على عنوان IP آخر
      const remoteAddress = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
      if (remoteAddress) {
        (options.headers as Record<string, any>)['x-forwarded-for'] = remoteAddress;
      }
    }

    // تحديد البروتوكول (HTTP أو HTTPS)
    const protocolModule = options.protocol === 'https:' ? https : http;

    // إنشاء طلب إلى الخادم المستهدف
    const proxyReq = protocolModule.request(options, (proxyRes) => {
      // نقل رمز الحالة والترويسات من الخادم المستهدف
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);

      // نقل البيانات من الخادم المستهدف إلى العميل
      proxyRes.pipe(res, { end: true });
    });

    // معالجة أخطاء الاتصال بالخادم المستهدف
    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Bad Gateway: Proxy Request Failed');
    });

    // نقل البيانات من العميل إلى الخادم المستهدف
    req.pipe(proxyReq, { end: true });
  } catch (err) {
    console.error('Relay error:', err instanceof Error ? err.message : String(err));
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: Tunnel Failed');
  }
}

/**
 * دالة للتحقق من أن الخادم المستهدف متاح
 * تُستخدم للاختبارات والتشخيص
 */
export async function checkTargetAvailability(): Promise<boolean> {
  return new Promise((resolve) => {
    const targetDomain = process.env.TARGET_DOMAIN;

    if (!targetDomain) {
      resolve(false);
      return;
    }

    try {
      const options: any = url.parse(targetDomain);
      options.method = 'HEAD';
      options.timeout = 5000;

      const protocolModule = options.protocol === 'https:' ? https : http;

      const req = protocolModule.request(options, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
        req.destroy();
      });

      req.on('error', () => {
        resolve(false);
      });

      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    } catch {
      resolve(false);
    }
  });
}
