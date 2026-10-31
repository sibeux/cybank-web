---
trigger: always_on
---

# Project Philosophy: Mature Libraries Over Custom Reinvention

## Core Principle
- **Gunakan Library yang Matang & Teruji**: Utamakan penggunaan library atau package pihak ketiga yang sudah populer, mature, dan aktif dimaintain daripada membuat solusi sendiri dari nol (reinventing the wheel).
- **Contoh Kasus**:
  - Visualisasi data / grafik: gunakan `chart.js` + `react-chartjs-2` (atau `recharts` / library mature sejenis).
  - Date picking / formatting: gunakan library seperti `date-fns`, `dayjs`, atau komponen UI mature.
  - Tabel kompleks / sorting / filtering: gunakan library seperti `@tanstack/react-table` jika dibutuhkan fitur lanjutan.
  - Form handling & validasi: gunakan `react-hook-form` + `zod` jika diperlukan.
  - Komponen UI / Primitives: gunakan `radix-ui` / `shadcn/ui` / `headlessui` daripada membangun komponen kompleks seperti modal/dropdown/popover dengan event listener manual yang rentan bug.
- **Kesesuaian**: Pastikan library yang dipilih kompatibel dengan versi Next.js (Next 15+) dan React (React 19) yang digunakan pada project ini.