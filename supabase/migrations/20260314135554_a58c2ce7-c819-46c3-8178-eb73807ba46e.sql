UPDATE public.defense_document_templates
SET content = '<div style="text-align: center; margin-bottom: 24px;">
<p style="font-size: 16px; font-weight: bold; margin: 0;">الجمهورية الجزائرية الديمقراطية الشعبية</p>
<p style="margin: 4px 0;">وزارة التعليم العالي والبحث العلمي</p>
<p style="font-weight: bold; margin: 4px 0;">{{university_ar}}</p>
</div>

<p style="text-align: center; font-weight: bold; font-size: 15px; margin: 24px 0; text-decoration: underline;">مقرر رقم {{decision_number}} مؤرخ في {{decision_date}} يتضمن تعيين لجنة مناقشة أطروحة الدكتوراه.</p>

<p style="text-align: right; margin-bottom: 12px;">- إن مدير {{university_ar}}،</p>

<p style="text-align: justify;">- بمقتضى المرسوم التنفيذي رقم 06/09 المؤرخ في 04 جانفي 2009 المتضمن إنشاء جامعة أم البواقي،</p>

<p style="text-align: justify;">- وبمقتضى المقرر الوزاري رقم 021 المؤرخ في 18 جانفي 2026، المتضمن تكليف السيد: .............. بتسيير شؤون إدارة مديرية {{university_ar}}.</p>

<p style="text-align: justify;">- وبمقتضى المرسوم التنفيذي رقم 08-265 المؤرخ في 17 شعبان عام 1429 الموافق 19 غشت سنة 2008 والمتضمن نظام الدراسات للحصول على شهادة الليسانس وشهادة الماستر وشهادة الدكتوراه،</p>

<p style="text-align: justify;">- وبموجب القرار رقم 961 المؤرخ في 02 ديسمبر 2020 الذي يحدد كيفيات تنظيم التكوين في الطور الثالث وشروط إعداد أطروحة الدكتوراه ومناقشتها،</p>

<p style="text-align: justify;">- وبموجب القرار رقم 962 المؤرخ في 02 ديسمبر 2020 والمتضمن تأهيل مؤسسات التعليم العالي لضمان التكوين لنيل شهادة الدكتوراه ويحدد عدد المناصب المفتوحة بعنوان السنة الجامعية {{current_year}}</p>

<p style="text-align: justify;">- وبناء على اقتراح المجلس العلمي لكلية {{faculty_ar}} المثبت بموجب محضر اجتماعه المنعقد بتاريخ {{scientific_council_date}}،</p>

<p style="text-align: center; font-weight: bold; margin: 16px 0;">يقرر ما يأتي:</p>

<p style="text-align: justify;"><b>المادة الأولى:</b> يُعيَّن بموجب هذا المقرر لجنة مناقشة أطروحة الدكتوراه للطالب (ة): <b>{{full_name_ar}}</b>، المولود (ة) بتاريخ: {{date_of_birth}} بـ: {{birthplace_ar}} – {{province}}، والموسومة بـ: <b>{{thesis_title_ar}}</b></p>

<p style="text-align: justify;">والمسجّل(ة) بكلية {{faculty_ar}}</p>

<p style="text-align: justify;"><b>المادة 2:</b> تتشكّل اللجنة المشار إليها في المادة الأولى من الأعضاء الآتي ذكرهم:</p>

<table style="width: 100%; border-collapse: collapse; margin: 12px 0; direction: rtl;" border="1">
<thead>
<tr>
<th style="border: 1px solid #333; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold; width: 8%;">رقم</th>
<th style="border: 1px solid #333; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold; width: 32%;">الاسم واللقب</th>
<th style="border: 1px solid #333; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold; width: 35%;">مؤسسة الانتماء</th>
<th style="border: 1px solid #333; padding: 8px; text-align: center; background: #f0f0f0; font-weight: bold; width: 25%;">الصفة</th>
</tr>
</thead>
<tbody>
<tr>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">1</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">{{jury_president_ar}}</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">{{university_ar}}</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">رئيسا</td>
</tr>
<tr>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">2</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">{{supervisor_ar}}</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">{{supervisor_university}}</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">مشرفا ومقررا</td>
</tr>
<tr>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">3</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">ممتحنا</td>
</tr>
<tr>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">4</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">ممتحنا</td>
</tr>
<tr>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">5</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">ممتحنا</td>
</tr>
<tr>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">6</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">&nbsp;</td>
<td style="border: 1px solid #333; padding: 8px; text-align: center;">ممتحنا</td>
</tr>
</tbody>
</table>

<p style="text-align: justify;"><b>المادة 3:</b> يُكلَّف عميد كلية {{faculty_ar}} بتنفيذ هذا المقرر الذي يُسلَّم نسخة عنه إلى كل من الطالب المعني وأعضاء لجنة المناقشة فور توقيعه.</p>

<p style="text-align: justify;"><b>المادة 4:</b> تُحفظ نسخة عن هذا المقرر ضمن الملف البيداغوجي للطالب وينشر في النشرة الرسمية لـ{{university_ar}}.</p>

<p style="text-align: left; margin-top: 30px;">حُرر بـ{{province}}، في: {{decision_date}}</p>

<p style="text-align: left; margin-top: 20px; font-weight: bold;">{{signature_title}}</p>',
    updated_at = now()
WHERE document_type = 'jury_decision_lmd';