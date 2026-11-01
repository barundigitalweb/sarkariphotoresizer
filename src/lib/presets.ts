export interface ExamPreset {
  id: string;
  name: string;
  category: 'ssc' | 'railway' | 'upsc' | 'banking' | 'police' | 'nta' | 'teaching' | 'defense' | 'custom';
  badge: string;
  description: string;
  photo: {
    widthPx: number;
    heightPx: number;
    widthCm: number;
    heightCm: number;
    minKb: number;
    maxKb: number;
    format: 'image/jpeg' | 'image/png';
    requiresDop: boolean;
    dopInstruction?: string;
  };
  signature: {
    widthPx: number;
    heightPx: number;
    widthCm: number;
    heightCm: number;
    minKb: number;
    maxKb: number;
    format: 'image/jpeg' | 'image/png';
  };
}

export const EXAM_PRESETS: ExamPreset[] = [
  {
    id: 'ssc',
    name: 'SSC All Exams (CGL, CHSL, MTS, GD, CPO, Steno)',
    category: 'ssc',
    badge: 'Most Popular 🔥',
    description: '3.5 cm x 4.5 cm (350x450 px), 20 KB to 50 KB JPG. Plain background, clear face without cap/glasses.',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 20,
      maxKb: 50,
      format: 'image/jpeg',
      requiresDop: false,
      dopInstruction: 'As per SSC latest guidelines, plain photo without spectacles/cap. Name & Date is optional.'
    },
    signature: {
      widthPx: 400,
      heightPx: 200,
      widthCm: 4.0,
      heightCm: 2.0,
      minKb: 10,
      maxKb: 20,
      format: 'image/jpeg'
    }
  },
  {
    id: 'railway',
    name: 'Railway RRB (ALP, Technician, NTPC, Group D)',
    category: 'railway',
    badge: 'RRB 2026',
    description: '35 mm x 45 mm, 30 KB to 70 KB JPG. Plain white background, clear face without goggles.',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 30,
      maxKb: 70,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 350,
      heightPx: 150,
      widthCm: 3.5,
      heightCm: 1.5,
      minKb: 15,
      maxKb: 30,
      format: 'image/jpeg'
    }
  },
  {
    id: 'upsc',
    name: 'UPSC (Civil Services IAS, NDA, CDS, CAPF)',
    category: 'upsc',
    badge: 'UPSC 2026',
    description: 'Min 350x350 px to Max 1000x1000 px, 20 KB to 300 KB. Candidate Name & Date of Photo mandatory.',
    photo: {
      widthPx: 500,
      heightPx: 500,
      widthCm: 4.0,
      heightCm: 4.0,
      minKb: 20,
      maxKb: 300,
      format: 'image/jpeg',
      requiresDop: true,
      dopInstruction: 'UPSC mandates candidate Name & Date of taking photograph printed on bottom strip.'
    },
    signature: {
      widthPx: 500,
      heightPx: 250,
      widthCm: 4.0,
      heightCm: 2.0,
      minKb: 20,
      maxKb: 300,
      format: 'image/jpeg'
    }
  },
  {
    id: 'banking',
    name: 'Banking (IBPS PO/Clerk, SBI PO/Clerk, RBI)',
    category: 'banking',
    badge: 'IBPS / SBI',
    description: '200 x 230 px, 20 KB to 50 KB JPG. Signature 140x60 px, 10 KB to 20 KB.',
    photo: {
      widthPx: 200,
      heightPx: 230,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 20,
      maxKb: 50,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 140,
      heightPx: 60,
      widthCm: 3.0,
      heightCm: 1.5,
      minKb: 10,
      maxKb: 20,
      format: 'image/jpeg'
    }
  },
  {
    id: 'nta',
    name: 'NTA Exams (NEET UG, JEE Main, CUET)',
    category: 'nta',
    badge: 'NEET / JEE',
    description: '10 KB to 200 KB JPG. White background with 80% face coverage. Signature 4 KB to 30 KB.',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 10,
      maxKb: 200,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 400,
      heightPx: 150,
      widthCm: 4.0,
      heightCm: 1.5,
      minKb: 4,
      maxKb: 30,
      format: 'image/jpeg'
    }
  },
  {
    id: 'police',
    name: 'State Police (UP Police, WB Police, Bihar Daroga)',
    category: 'police',
    badge: 'Police Bharti',
    description: '3.5 cm x 4.5 cm, 20 KB to 50 KB. Signature 5 KB to 20 KB.',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 20,
      maxKb: 50,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 300,
      heightPx: 120,
      widthCm: 3.5,
      heightCm: 1.5,
      minKb: 5,
      maxKb: 20,
      format: 'image/jpeg'
    }
  },
  {
    id: 'teaching',
    name: 'Teaching Exams (CTET, State TET, KVS, NVS)',
    category: 'teaching',
    badge: 'CTET / TET',
    description: '3.5 cm x 4.5 cm, 10 KB to 100 KB JPG. Signature 4 KB to 30 KB.',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 10,
      maxKb: 100,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 350,
      heightPx: 150,
      widthCm: 3.5,
      heightCm: 1.5,
      minKb: 4,
      maxKb: 30,
      format: 'image/jpeg'
    }
  },
  {
    id: 'defense',
    name: 'Defense & Agniveer (Army, Air Force, Navy)',
    category: 'defense',
    badge: 'Agniveer',
    description: '3.5 cm x 4.5 cm, 10 KB to 20 KB JPG. Signature 5 KB to 10 KB.',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 10,
      maxKb: 20,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 350,
      heightPx: 150,
      widthCm: 3.5,
      heightCm: 1.5,
      minKb: 5,
      maxKb: 10,
      format: 'image/jpeg'
    }
  },
  {
    id: 'custom',
    name: 'Custom Resizer (Enter Your Own Dimensions & KB)',
    category: 'custom',
    badge: 'Custom ⚙️',
    description: 'Freely choose exact width, height, and target size in KB (e.g. 20KB, 50KB, 100KB, 200KB).',
    photo: {
      widthPx: 350,
      heightPx: 450,
      widthCm: 3.5,
      heightCm: 4.5,
      minKb: 20,
      maxKb: 50,
      format: 'image/jpeg',
      requiresDop: false
    },
    signature: {
      widthPx: 400,
      heightPx: 200,
      widthCm: 4.0,
      heightCm: 2.0,
      minKb: 10,
      maxKb: 20,
      format: 'image/jpeg'
    }
  }
];
