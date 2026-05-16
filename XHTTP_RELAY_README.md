# XHTTP Relay - خادم HTTP وكيل (Proxy Server)

خادم HTTP وكيل متقدم يعيد توجيه جميع الطلبات الواردة إلى نطاق مستهدف محدد مع معالجة شاملة للترويسات وأخطاء الاتصال.

## الميزات الرئيسية

✅ **إعادة التوجيه الكاملة**: جميع الطلبات HTTP/HTTPS تُعاد توجيهها إلى النطاق المستهدف  
✅ **تصفية الترويسات الحساسة**: إزالة ترويسات مثل `host`, `connection`, `x-forwarded-*` للحفاظ على الأمان  
✅ **تمرير عنوان IP الحقيقي**: دعم `x-forwarded-for` و `x-real-ip` لتمرير عنوان IP الحقيقي للعميل  
✅ **معالجة الأخطاء**: إرجاع `502 Bad Gateway` عند فشل الاتصال بالخادم المستهدف  
✅ **دعم جميع طرق HTTP**: GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS وغيرها  
✅ **Streaming الثنائي**: دعم كامل لتمرير البيانات الثنائية والملفات الكبيرة  

## البنية التحتية

- **الخادم**: Node.js + Express
- **اللغة**: TypeScript
- **الاختبارات**: Vitest
- **النشر**: Manus WebDev

## الملفات الرئيسية

```
server/
  ├── proxy.ts          # معالج Proxy الرئيسي
  ├── proxy.test.ts     # اختبارات Vitest
  └── _core/
      └── index.ts      # نقطة دخول الخادم
```

## متغيرات البيئة

```env
TARGET_DOMAIN=https://thumbayan.com:443  # النطاق المستهدف
PORT=3000                                # منفذ الخادم (اختياري)
NODE_ENV=production                      # بيئة التشغيل
```

## الاستخدام

### التطوير المحلي

```bash
# تثبيت التبعيات
pnpm install

# تشغيل الخادم في وضع التطوير
pnpm dev

# تشغيل الاختبارات
pnpm test

# بناء المشروع للإنتاج
pnpm build

# تشغيل الخادم في وضع الإنتاج
pnpm start
```

## الطلبات

جميع الطلبات الواردة إلى الخادم تُعاد توجيهها إلى النطاق المستهدف:

```bash
# مثال: طلب GET
curl http://localhost:3000/api/users

# يُعاد توجيهه إلى:
# https://thumbayan.com:443/api/users

# مثال: طلب POST مع بيانات
curl -X POST http://localhost:3000/api/data \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# يُعاد توجيهه إلى:
# https://thumbayan.com:443/api/data
```

## الترويسات المُصفاة

الترويسات التالية تُزال قبل إعادة التوجيه:

- `host`
- `connection`
- `keep-alive`
- `proxy-authenticate`
- `proxy-authorization`
- `te`
- `trailer`
- `transfer-encoding`
- `upgrade`
- `forwarded`
- `x-forwarded-host`
- `x-forwarded-proto`
- `x-forwarded-port`
- `x-vercel-*` (ترويسات Vercel)

## الترويسات المُضافة

- `x-forwarded-for`: يتم إضافة عنوان IP الحقيقي للعميل

## معالجة الأخطاء

عند فشل الاتصال بالخادم المستهدف:

```
HTTP/1.1 502 Bad Gateway
Content-Type: text/plain

Bad Gateway: Proxy Request Failed
```

## الاختبارات

تم كتابة 15 اختبار Vitest شامل يغطي:

- ✅ إعادة التوجيه الأساسية
- ✅ تصفية الترويسات الحساسة
- ✅ تمرير عنوان IP الحقيقي
- ✅ معالجة الأخطاء
- ✅ دعم جميع طرق HTTP
- ✅ دعم المسارات المختلفة
- ✅ التحقق من توفر الخادم المستهدف

```bash
pnpm test
```

## الأداء

- **الاستجابة السريعة**: تمرير مباشر للطلبات والاستجابات
- **دعم Streaming**: معالجة البيانات الكبيرة بكفاءة
- **معالجة الأخطاء الموثوقة**: إرجاع رسائل خطأ واضحة

## الأمان

- ✅ تصفية الترويسات الحساسة
- ✅ دعم HTTPS
- ✅ معالجة آمنة للأخطاء
- ✅ عدم تسرب معلومات الخادم الداخلي

## الترخيص

ISC

---

**تم إنشاؤه بواسطة:** Manus  
**آخر تحديث:** مايو 2026
