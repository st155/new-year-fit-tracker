import { useState } from 'react';

export interface InBodyData {
  basicInfo: {
    id: string | null;
    height: number | null;
    age: number | null;
    gender: string;
    testDate: string | null;
  };
  bodyComposition: {
    totalBodyWater: number | null;
    protein: number | null;
    minerals: number | null;
    bodyFatMass: number | null;
    softLeanMass: number | null;
    fatFreeMass: number | null;
    weight: number | null;
  };
  muscleFatAnalysis: {
    weight: number | null;
    smm: number | null;
    skeletalMuscleMass: number | null;
    bodyFatMass: number | null;
  };
  obesityAnalysis: {
    bmi: number | null;
    pbf: number | null;
    percentBodyFat: number | null;
  };
  segmentalAnalysis: {
    rightArm: { leanMass: number | null; ecwRatio: number | null };
    leftArm: { leanMass: number | null; ecwRatio: number | null };
    trunk: { leanMass: number | null; ecwRatio: number | null };
    rightLeg: { leanMass: number | null; ecwRatio: number | null };
    leftLeg: { leanMass: number | null; ecwRatio: number | null };
  };
  ecwAnalysis: {
    ecwRatio: number | null;
    tbw: number | null;
    icw: number | null;
    ecw: number | null;
  };
  researchParameters: {
    intracellularWater: number | null;
    extracellularWater: number | null;
    basalMetabolicRate: number | null;
    bmr: number | null;
    waistHipRatio: number | null;
    bodyCellMass: number | null;
    smi: number | null;
  };
  visceralFat: {
    area: number | null;
    vfa: number | null;
  };
  metadata: {
    parsedAt: string;
    rawTextLength: number;
  };
}

export class InBodyParser {
  private data: InBodyData | null = null;
  private rawText: string = '';

  async parsePDF(file: File): Promise<InBodyData> {
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('File exceeds maximum size of 15 MB');
    }

    if (file.type !== 'application/pdf') {
      throw new Error('File must be in PDF format');
    }

    try {
      // @ts-ignore - PDF.js global object
      const pdfjsLib = window.pdfjsLib;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      this.rawText = fullText;
      return this.extractData(fullText);
      
    } catch (error) {
      throw new Error(`Error reading PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractData(text: string): InBodyData {
    const data: InBodyData = {
      basicInfo: this.extractBasicInfo(text),
      bodyComposition: this.extractBodyComposition(text),
      muscleFatAnalysis: this.extractMuscleFatAnalysis(text),
      obesityAnalysis: this.extractObesityAnalysis(text),
      segmentalAnalysis: this.extractSegmentalAnalysis(text),
      ecwAnalysis: this.extractECWAnalysis(text),
      researchParameters: this.extractResearchParameters(text),
      visceralFat: this.extractVisceralFat(text),
      metadata: {
        parsedAt: new Date().toISOString(),
        rawTextLength: text.length
      }
    };
    
    this.data = data;
    return data;
  }

  private extractBasicInfo(text: string) {
    return {
      id: this.extractValue(text, /ID[^\d]*(\d+)/),
      height: this.extractValue(text, /Height[^\d]*([\d.]+)cm/),
      age: this.extractValue(text, /Age[^\d]*(\d+)/),
      gender: text.includes('Male') && !text.includes('Female') ? 'Male' : 'Female',
      testDate: this.extractValue(text, /Test Date.*?(\d+\.\d+\.\d+)/) || 
               this.extractValue(text, /(\d{2}\.\d{2}\.\d{4})/)
    };
  }

  private extractBodyComposition(text: string) {
    return {
      totalBodyWater: this.extractValue(text, /Total Body Water[^\d]*([\d.]+)/),
      protein: this.extractValue(text, /Protein[^\d]*([\d.]+)/),
      minerals: this.extractValue(text, /Minerals[^\d]*([\d.]+)/),
      bodyFatMass: this.extractValue(text, /Body Fat Mass[^\d]*([\d.]+)/),
      softLeanMass: this.extractValue(text, /Soft Lean Mass[^\d]*([\d.]+)/),
      fatFreeMass: this.extractValue(text, /Fat Free Mass[^\d]*([\d.]+)/),
      weight: this.extractValue(text, /Weight[^\d]*([\d.]+)/)
    };
  }

  private extractMuscleFatAnalysis(text: string) {
    return {
      weight: this.extractValue(text, /Weight[^\d]*([\d.]+)/),
      smm: this.extractValue(text, /SMM[^\d]*([\d.]+)/),
      skeletalMuscleMass: this.extractValue(text, /Skeletal Muscle Mass[^\d]*([\d.]+)/),
      bodyFatMass: this.extractValue(text, /Body Fat Mass[^\d]*([\d.]+)/)
    };
  }

  private extractObesityAnalysis(text: string) {
    return {
      bmi: this.extractValue(text, /BMI[^\d]*([\d.]+)/),
      pbf: this.extractValue(text, /PBF[^\d]*([\d.]+)/),
      percentBodyFat: this.extractValue(text, /Percent Body Fat[^\d]*([\d.]+)/)
    };
  }

  private extractSegmentalAnalysis(text: string) {
    return {
      rightArm: {
        leanMass: this.extractValue(text, /Right Arm[^\d]*([\d.]+)/),
        ecwRatio: this.extractValue(text, /Right Arm.*?ECW.*?([\d.]+)/)
      },
      leftArm: {
        leanMass: this.extractValue(text, /Left Arm[^\d]*([\d.]+)/),
        ecwRatio: this.extractValue(text, /Left Arm.*?ECW.*?([\d.]+)/)
      },
      trunk: {
        leanMass: this.extractValue(text, /Trunk[^\d]*([\d.]+)/),
        ecwRatio: this.extractValue(text, /Trunk.*?ECW.*?([\d.]+)/)
      },
      rightLeg: {
        leanMass: this.extractValue(text, /Right Leg[^\d]*([\d.]+)/),
        ecwRatio: this.extractValue(text, /Right Leg.*?ECW.*?([\d.]+)/)
      },
      leftLeg: {
        leanMass: this.extractValue(text, /Left Leg[^\d]*([\d.]+)/),
        ecwRatio: this.extractValue(text, /Left Leg.*?ECW.*?([\d.]+)/)
      }
    };
  }

  private extractECWAnalysis(text: string) {
    return {
      ecwRatio: this.extractValue(text, /ECW Ratio[^\d]*([\d.]+)/),
      tbw: this.extractValue(text, /TBW[^\d]*([\d.]+)/),
      icw: this.extractValue(text, /ICW[^\d]*([\d.]+)/),
      ecw: this.extractValue(text, /ECW[^\d]*([\d.]+)/)
    };
  }

  private extractResearchParameters(text: string) {
    return {
      intracellularWater: this.extractValue(text, /Intracellular Water[^\d]*([\d.]+)/),
      extracellularWater: this.extractValue(text, /Extracellular Water[^\d]*([\d.]+)/),
      basalMetabolicRate: this.extractValue(text, /Basal Metabolic Rate[^\d]*(\d+)/),
      bmr: this.extractValue(text, /BMR[^\d]*(\d+)/),
      waistHipRatio: this.extractValue(text, /Waist-Hip Ratio[^\d]*([\d.]+)/),
      bodyCellMass: this.extractValue(text, /Body Cell Mass[^\d]*([\d.]+)/),
      smi: this.extractValue(text, /SMI[^\d]*([\d.]+)/)
    };
  }

  private extractVisceralFat(text: string) {
    return {
      area: this.extractValue(text, /Visceral Fat Area[^\d]*([\d.]+)/),
      vfa: this.extractValue(text, /VFA[^\d]*([\d.]+)/)
    };
  }

  private extractValue(text: string, regex: RegExp): number | null {
    const match = text.match(regex);
    return match ? parseFloat(match[1]) : null;
  }

  getSummary() {
    if (!this.data) return null;

    const { bodyComposition, obesityAnalysis, muscleFatAnalysis } = this.data;

    return {
      weight: bodyComposition.weight,
      bmi: obesityAnalysis.bmi,
      bodyFatPercent: obesityAnalysis.pbf,
      muscleMass: muscleFatAnalysis.smm,
      status: this.getHealthStatus()
    };
  }

  private getHealthStatus(): string {
    if (!this.data) return 'unknown';
    
    const bmi = this.data.obesityAnalysis.bmi;
    const pbf = this.data.obesityAnalysis.pbf;

    if (!bmi || !pbf) return 'unknown';

    if (bmi >= 18.5 && bmi <= 25 && pbf <= 20) return 'optimal';
    if (bmi >= 18.5 && bmi <= 30 && pbf <= 25) return 'normal';
    if (bmi > 30 || pbf > 25) return 'attention';
    return 'risk';
  }

  getRecommendations() {
    if (!this.data) return [];
    
    const recommendations = [];
    const { obesityAnalysis, muscleFatAnalysis, visceralFat } = this.data;

    if (obesityAnalysis?.bmi && obesityAnalysis.bmi > 25) {
      recommendations.push({
        type: 'warning' as const,
        category: 'weight',
        message: 'BMI above normal. Consultation with specialist recommended.'
      });
    }

    if (obesityAnalysis?.pbf && obesityAnalysis.pbf > 20) {
      recommendations.push({
        type: 'info' as const,
        category: 'fat',
        message: 'Body fat percentage above target. Cardio workouts recommended.'
      });
    }

    if (muscleFatAnalysis?.smm && muscleFatAnalysis.smm < 30) {
      recommendations.push({
        type: 'info' as const,
        category: 'muscle',
        message: 'Low muscle mass. Strength training recommended.'
      });
    }

    if (visceralFat?.area && visceralFat.area > 100) {
      recommendations.push({
        type: 'warning' as const,
        category: 'visceral',
        message: 'High visceral fat level. Important to consult specialist.'
      });
    }

    return recommendations;
  }

  toJSON(): string {
    return JSON.stringify(this.data, null, 2);
  }

  getData(): InBodyData | null {
    return this.data;
  }
}

export class InBodyUtils {
  static compareTests(oldData: InBodyData, newData: InBodyData) {
    const changes: Record<string, any> = {};
    
    const metrics = [
      { path: 'bodyComposition.weight', name: 'weight' },
      { path: 'obesityAnalysis.bmi', name: 'bmi' },
      { path: 'obesityAnalysis.pbf', name: 'bodyFat' },
      { path: 'muscleFatAnalysis.smm', name: 'muscle' },
      { path: 'bodyComposition.bodyFatMass', name: 'fatMass' }
    ];
    
    metrics.forEach(({ path, name }) => {
      const [category, field] = path.split('.');
      const oldValue = (oldData as any)?.[category]?.[field];
      const newValue = (newData as any)?.[category]?.[field];
      
      if (oldValue !== null && newValue !== null) {
        const diff = newValue - oldValue;
        changes[name] = {
          old: oldValue,
          new: newValue,
          diff: diff,
          percent: ((diff / oldValue) * 100).toFixed(1),
          improved: this.isImprovement(name, diff)
        };
      }
    });
    
    return changes;
  }

  private static isImprovement(metric: string, diff: number): boolean {
    if (['weight', 'bodyFat', 'fatMass'].includes(metric)) {
      return diff < 0;
    }
    if (['muscle'].includes(metric)) {
      return diff > 0;
    }
    return false;
  }

  static exportToCSV(data: InBodyData): string {
    const rows = [
      ['Metric', 'Value', 'Unit'],
      ['Test Date', data.basicInfo.testDate || 'N/A', ''],
      ['Weight', data.bodyComposition.weight?.toString() || 'N/A', 'kg'],
      ['BMI', data.obesityAnalysis.bmi?.toString() || 'N/A', 'kg/m²'],
      ['Body Fat %', data.obesityAnalysis.pbf?.toString() || 'N/A', '%'],
      ['Muscle Mass', data.muscleFatAnalysis.smm?.toString() || 'N/A', 'kg'],
      ['Body Fat Mass', data.bodyComposition.bodyFatMass?.toString() || 'N/A', 'kg'],
      ['Visceral Fat', data.visceralFat.area?.toString() || 'N/A', 'cm²']
    ];
    
    return rows.map(row => row.join(',')).join('\n');
  }
}

export function useInBodyParser() {
  const [data, setData] = useState<InBodyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = async (file: File) => {
    setLoading(true);
    setError(null);
    
    try {
      const parser = new InBodyParser();
      const result = await parser.parsePDF(file);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return {
    data,
    loading,
    error,
    parseFile,
    reset
  };
}
