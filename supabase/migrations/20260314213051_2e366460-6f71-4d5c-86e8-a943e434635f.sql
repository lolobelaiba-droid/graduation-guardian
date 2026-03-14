
INSERT INTO defense_document_templates (document_type, title, content, font_family, font_size, line_height, margin_top, margin_bottom, margin_right, margin_left)
VALUES
('defense_minutes_lmd', 'محضر مداولات لجنة المناقشة - دكتوراه ل م د',
'<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px;">الجمهورية الجزائرية الديمقراطية الشعبية</p>
<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 14px;">وزارة التعليم العالي والبحث العلمي</p>
<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 15px;">{{university_ar}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl;">رقم: {{minutes_number}}/ {{minutes_year}}</p>
<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px; text-decoration: underline;">محضر مداولات لجنة مناقشة أطروحة الدكتوراه</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl;">في يوم: {{defense_date}} على الساعة: {{defense_time}} بـ{{university_ar}}</p>
<p style="text-align: right; direction: rtl;">ناقش(ت) علنـــا الطالـــب(ة): {{full_name_ar}}</p>
<p style="text-align: right; direction: rtl;">المولـــود(ة) بتاريـــخ: {{date_of_birth}} بـ: {{birthplace_ar}} - {{province}}</p>
<p style="text-align: right; direction: rtl;">أطروحة الدكتوراه لنيـــل شهـــادة: دكتوراه ل م د</p>
<p style="text-align: right; direction: rtl;">الشعبة: {{branch_ar}}</p>
<p style="text-align: right; direction: rtl;">التخصـــص: {{specialty_ar}}</p>
<p style="text-align: right; direction: rtl;">عنوان أطروحة الدكتوراه: {{thesis_title_ar}}</p>
<p style="text-align: right; direction: rtl;">{{thesis_title_fr}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl; font-weight: bold;">أمـــام اللجنـــة المكونـــة مـــن:</p>
<p style="text-align: right; direction: rtl;">{{jury_table_with_signature}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl; font-weight: bold;">ملاحظات:</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl; font-weight: bold;">بعد المناقشة العلنية و المداولات السرية تقترح اللجنة منح المترشح(ة) شهادة الدكتوراه بتقدير: {{mention}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: left; direction: rtl;">رئيس اللجنة</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<table style="width: 100%; border: none; direction: rtl;">
<tbody>
<tr>
<td style="text-align: center; border: none; width: 50%;">نائب مدير الجامعة</td>
<td style="text-align: center; border: none; width: 50%;">{{faculty_head_title}} {{faculty_ar}}</td>
</tr>
</tbody>
</table>',
'IBM Plex Sans Arabic', 13, 1.8, 15, 15, 20, 20),

('defense_minutes_science', 'محضر مداولات لجنة المناقشة - دكتوراه علوم',
'<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px;">الجمهورية الجزائرية الديمقراطية الشعبية</p>
<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 14px;">وزارة التعليم العالي والبحث العلمي</p>
<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 15px;">{{university_ar}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl;">رقم: {{minutes_number}}/ {{minutes_year}}</p>
<p style="text-align: center; direction: rtl; font-weight: bold; font-size: 16px; text-decoration: underline;">محضر مداولات لجنة مناقشة أطروحة الدكتوراه</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl;">في يوم: {{defense_date}} على الساعة: {{defense_time}} بـ{{university_ar}}</p>
<p style="text-align: right; direction: rtl;">ناقش(ت) علنـــا الطالـــب(ة): {{full_name_ar}}</p>
<p style="text-align: right; direction: rtl;">المولـــود(ة) بتاريـــخ: {{date_of_birth}} بـ: {{birthplace_ar}} - {{province}}</p>
<p style="text-align: right; direction: rtl;">أطروحة الدكتوراه لنيـــل شهـــادة: دكتوراه علوم</p>
<p style="text-align: right; direction: rtl;">الشعبة: {{branch_ar}}</p>
<p style="text-align: right; direction: rtl;">التخصـــص: {{specialty_ar}}</p>
<p style="text-align: right; direction: rtl;">عنوان أطروحة الدكتوراه: {{thesis_title_ar}}</p>
<p style="text-align: right; direction: rtl;">{{thesis_title_fr}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl; font-weight: bold;">أمـــام اللجنـــة المكونـــة مـــن:</p>
<p style="text-align: right; direction: rtl;">{{jury_table_with_signature}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl; font-weight: bold;">ملاحظات:</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">...............................................................................................................................................................</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl; font-weight: bold;">بعد المناقشة العلنية و المداولات السرية تقترح اللجنة منح المترشح(ة) شهادة الدكتوراه بتقدير: {{mention}}</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: left; direction: rtl;">رئيس اللجنة</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<p style="text-align: right; direction: rtl;">&nbsp;</p>
<table style="width: 100%; border: none; direction: rtl;">
<tbody>
<tr>
<td style="text-align: center; border: none; width: 50%;">نائب مدير الجامعة</td>
<td style="text-align: center; border: none; width: 50%;">{{faculty_head_title}} {{faculty_ar}}</td>
</tr>
</tbody>
</table>',
'IBM Plex Sans Arabic', 13, 1.8, 15, 15, 20, 20);
