# Mental Health App — Unified Design System

## Design direction

ใช้ component และ layout system ชุดเดียวกันทุก role แล้วเปลี่ยนเฉพาะ semantic color tokens เพื่อให้แต่ละ role มีบุคลิกชัดเจน แต่ยังรู้สึกว่าเป็นผลิตภัณฑ์เดียวกัน

## 1. Color palette

### Shared foundation

| Token | Hex | ใช้กับ |
|---|---:|---|
| `text-primary` | `#172B3A` | ข้อความหลัก |
| `text-secondary` | `#526675` | ข้อความรอง |
| `surface-white` | `#FFFFFF` | Card / Input |
| `border-default` | `#D9E3EA` | เส้นขอบ |
| `success` | `#16805C` | สำเร็จ |
| `warning` | `#B45309` | แจ้งเตือน |
| `error` | `#C2413B` | ข้อผิดพลาด |
| `focus-ring` | `#2563EB` | Keyboard focus |

### Role 1 — User

โทนสดใส ผ่อนคลาย และเป็นมิตร โดยยึดภาพตัวอย่าง MindEase ที่แนบ: ท้องฟ้าฟ้าอ่อน, พื้นผิวขาว, ปุ่มฟ้ากลาง และตัวอักษรสีน้ำเงินเข้ม ให้ Login, หน้า User และแถบนำทางด้านล่างเป็นภาพจำชุดเดียวกัน สีด้านล่างเป็นค่าประมาณจากภาพหน้าจอที่แนบ ไม่ใช่ค่าสีที่อ่านจากไฟล์ Canva ต้นฉบับโดยตรง

| Token | Hex |
|---|---:|
| `primary` | `#3F76C9` |
| `primary-hover` | `#3266B4` |
| `brand-blue` | `#4F86D9` |
| `primary-strong` | `#285EA8` |
| `primary-soft` | `#E8F2FF` |
| `secondary` | `#78B4E8` |
| `background` | `#EAF4FF` |
| `surface` | `#FFFFFF` |
| `surface-soft` | `#F5FAFF` |
| `border` | `#D5E5F8` |
| `input-border` | `#B8C0CB` |
| `text-primary` | `#294F80` |
| `text-secondary` | `#5D7390` |
| `focus-ring` | `#286CC1` |
| `illustration-sky` | `#B7D3F7` |
| `illustration-cloud` | `#F7FBFF` |
| `navigation-active` | `#E5F0FF` |
| `navigation-inactive` | `#5F7185` |

ใช้ `primary` สำหรับปุ่มหลักที่มีข้อความสีขาวเพื่อให้ contrast อย่างน้อย `4.5:1`; ใช้ `brand-blue` เป็น accent/สีประกอบที่ไม่วางข้อความขนาดปกติสีขาวทับ ใช้ `primary-strong` สำหรับหัวข้อ/ลิงก์บนพื้นขาว และใช้พื้นหลัง sky/illustration เฉพาะส่วนตกแต่ง ไม่ใช้เป็นพื้นข้อความยาว รักษาสี success, warning และ error จาก shared foundation เป็นสีสถานะ ไม่เปลี่ยนตามสีแบรนด์

#### User — Login, home และแถบนำทาง

- **Login:** พื้นหลังฟ้าอ่อนหรือภาพประกอบท้องฟ้าอยู่หลังการ์ดฟอร์มสีขาว; การ์ดมีขอบเขตชัด มุมโค้งประมาณ `16–20px` และไม่ใช้สีพื้นฟ้าเข้มกับพื้นที่กรอกข้อมูล
- **ฟอร์ม:** ช่องกรอกสีขาว ขอบ `input-border` และข้อความ `text-primary`; ปุ่ม Login ใช้ `primary` พร้อมตัวอักษรขาว มี focus ring ชัดเจนและพื้นที่กดไม่น้อยกว่า `44px`
- **หน้า User:** ใช้ภาพประกอบ/ฉากฟ้าเป็น hero หรือพื้นหลังเฉพาะบริเวณ แล้ววางเนื้อหาหลักบนแผงสีขาวหรือ `surface-soft` เพื่อคงความอ่านง่ายและความรู้สึกสงบ
- **แถบนำทางด้านล่าง (bottom navigation bar):** ใช้พื้น `surface` สีขาว แยกจากเนื้อหาด้วยเส้นขอบบาง; รายการที่เลือกใช้ไอคอนและ label สี `primary-strong` บนพื้น `navigation-active`; รายการอื่นใช้ `navigation-inactive` ห้ามใช้ primary blue กับทุกรายการพร้อมกัน
- จำกัด bottom navigation ไว้ที่รายการหลักที่จำเป็น; คงไอคอนและ label ให้เข้าใจได้โดยไม่พึ่งสีอย่างเดียว และเว้นพื้นที่ safe-area ด้านล่างบนมือถือ
- ใช้ภาพประกอบแนวเมฆ/ท้องฟ้าเพื่อเสริม mood ของ User เท่านั้น ไม่ควรทำซ้ำเป็นพื้นหลังทุกหน้า หรือวางใต้ข้อความ/ข้อมูลสุขภาพที่ต้องอ่านต่อเนื่อง

### Role 2 — Psychologist

สะอาด สบายตา และเหมาะกับงานที่ต้องอ่านข้อมูลจำนวนมาก

| Token | Hex |
|---|---:|
| `primary` | `#475569` |
| `primary-hover` | `#334155` |
| `primary-soft` | `#F1F5F9` |
| `secondary` | `#0F766E` |
| `background` | `#F8FAFC` |
| `surface` | `#FFFFFF` |
| `border` | `#E2E8F0` |
| `text-primary` | `#1E293B` |
| `text-secondary` | `#64748B` |
| `clinical-info` | `#2563EB` |

ให้ gray เป็น visual anchor และใช้ teal/blue เพื่อบอกสถานะหรือ action เท่านั้น

### Role 3 — Admin

เป็นทางการ สื่อถึงระบบการแพทย์และความน่าเชื่อถือ

| Token | Hex |
|---|---:|
| `primary` | `#166534` |
| `primary-hover` | `#14532D` |
| `primary-soft` | `#F0FDF4` |
| `secondary` | `#0F766E` |
| `background` | `#F6F8F7` |
| `surface` | `#FFFFFF` |
| `border` | `#D1D5DB` |
| `text-primary` | `#172B3A` |
| `text-secondary` | `#52616B` |
| `medical-success` | `#16805C` |
| `medical-alert` | `#B45309` |

ใช้ green กับ navigation, primary action และ system status ไม่ควรใช้เขียวกับข้อมูลทุกประเภทจนแยกความสำคัญไม่ได้

## 2. Typography

ใช้ font family เดียวกันทุก role เพื่อให้ระบบเป็นหนึ่งเดียว:

### Noto Sans Thai

- Heading: `Noto Sans Thai 600–700`
- Body: `Noto Sans Thai 400`
- Label / Button: `Noto Sans Thai 500–600`
- Numeric / Data: `Noto Sans Thai 500–600`
- Fallback: `Arial, sans-serif`

```css
font-family: "Noto Sans Thai", Arial, sans-serif;
```

```css
--font-body: 16px;
--line-body: 1.5;
--font-caption: 13px;
--font-label: 14px;
--font-title: 24px;
--font-page-title: 32px;
```

ใช้ font เดียวกัน แต่สร้างความต่างของ role ผ่านสี, density, navigation และ status ไม่ใช่การเปลี่ยน font

## 3. Spacing and layout

ใช้ระบบ 4/8-point grid:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

- Page gutter: `16px` mobile, `24px` tablet, `32px` desktop
- Card padding: `16–24px`
- Gap ระหว่าง form fields: `16px`
- Gap ระหว่าง section: `32–48px`
- Input/button radius: `10px`
- Card radius: `14px`
- Modal radius: `18px`
- ความสูงปุ่มและ input: อย่างน้อย `44px`
- Breakpoints: `375px`, `768px`, `1024px`, `1440px`
- User content width: สูงสุด `720px` สำหรับ journaling/content
- Psychologist content width: สูงสุด `1200px` สำหรับ dashboard
- Admin content width: สูงสุด `1440px` สำหรับตารางและระบบจัดการ

### Shared components

Button, Input, Select, Textarea, Card, Modal, Drawer, Tabs, Toast, Badge, Status, Empty State, Loading Skeleton, Table, Chart และ Navigation Shell ควรใช้ component เดียวกัน แล้ว map สีผ่าน role tokens:

```css
.button-primary {
  background: var(--role-primary);
  color: var(--role-on-primary);
}
```

## 4. Icons and interaction

- ใช้ icon family เดียว เช่น Lucide
- ใช้ outline icon เป็นหลัก และ stroke ประมาณ `1.75–2px`
- ห้ามใช้ emoji เป็น icon ของระบบ
- Icon-only button ต้องมี accessible label
- ทุก interactive element ต้องมี hover, pressed และ focus state
- Animation ประมาณ `150–250ms`
- รองรับ `prefers-reduced-motion`
- สีไม่ควรเป็นตัวบอกสถานะเพียงอย่างเดียว ต้องมี label, icon หรือข้อความร่วมด้วย

## 5. Anti-patterns

- ใช้สีหลักของทั้ง 3 role ปะปนกันในหน้าเดียว
- เปลี่ยน font ตาม role จนดูเหมือนคนละผลิตภัณฑ์
- ใช้ gradient neon หรือม่วง/ชมพูแบบ AI ทั่วไปกับหน้าสุขภาพจิต
- ใช้ neumorphism หนักเกินไปจน contrast ต่ำและแยกขอบเขตไม่ได้
- ใช้ gray อ่อนกับ body text จนอ่านยาก
- ใช้สีแดงกับทุก warning หรือ error โดยไม่มีข้อความอธิบาย
- ใช้ emoji แทน icon
- ใช้ placeholder แทน label
- แสดง error เฉพาะด้านบนของฟอร์มโดยไม่ชี้ว่าช่องไหนผิด
- ทำ dashboard ของ Psychologist/Admin ให้แน่นจนไม่มี visual hierarchy
- ใช้ card, radius, shadow และ spacing หลายรูปแบบโดยไม่มี token กลาง
- ทำ navigation ต่างกันมากจนผู้ใช้รู้สึกว่าเป็นคนละระบบ

## 6. Pre-delivery checklist

### Visual

- [ ] ทุก role ใช้ component และ typography system เดียวกัน
- [ ] สี primary ของแต่ละ role ไม่ถูกใช้ข้าม role โดยไม่จำเป็น
- [ ] Text contrast อย่างน้อย `4.5:1`
- [ ] Border และ focus state มองเห็นได้ชัด
- [ ] ไม่มี emoji เป็น structural icon
- [ ] Icon มาจาก family เดียวกัน
- [ ] ไม่มี raw hex กระจายอยู่ใน component

### Interaction

- [ ] ปุ่มและ input สูงอย่างน้อย `44px`
- [ ] มี hover, pressed, disabled และ focus state
- [ ] มี loading state ระหว่าง async operation
- [ ] มี empty state พร้อมคำแนะนำหรือ action
- [ ] Error แสดงใกล้ field ที่ผิดและมีวิธีแก้
- [ ] รองรับ keyboard navigation
- [ ] รองรับ reduced motion

### Responsive

- [ ] ทดสอบที่ `375px`, `768px`, `1024px`, `1440px`
- [ ] ไม่มี horizontal scroll
- [ ] Content ไม่ถูกบังด้วย sticky header/footer
- [ ] ตารางและ dashboard มี mobile fallback
- [ ] Spacing ยังคงอยู่บน 4/8-point rhythm

### Accessibility

- [ ] ทุก form field มี label
- [ ] Icon-only control มี accessible name
- [ ] Decorative icon ถูกซ่อนจาก accessibility tree
- [ ] ไม่ใช้สีเป็นตัวบอกสถานะเพียงอย่างเดียว
- [ ] Screen reader focus order ตรงกับลำดับบนหน้าจอ
- [ ] Modal จัดการ focus ได้ถูกต้อง
- [ ] ข้อความภาษาไทยไม่ถูกตัดหรือ overflow
- [ ] Dynamic text size ไม่ทำให้ layout แตก
- [ ] Auto-rotating content มี pause/stop controls หรือไม่ใช้ auto-rotate
- [ ] Failed forms retain inline field errors และมี error summary เมื่อจำเป็น

## Design principle

Noto Sans Thai และ shared component library เป็นแกนกลางของทุก role ส่วน color tokens, navigation emphasis และ data density เป็นตัวแยกบุคลิกของ User, Psychologist และ Admin ให้แตกต่างอย่างเหมาะสม โดยยังคงเป็นระบบเดียวกัน
