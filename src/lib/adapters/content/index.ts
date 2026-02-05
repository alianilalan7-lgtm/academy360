export interface ContentProgram {
  externalId: string
  title: string
  description: string
  category: string
  difficultyLevel: number
  estimatedDurationMinutes: number
  thumbnailUrl?: string
  content: ContentProgramContent
  tags: string[]
}

export interface ContentProgramContent {
  introduction?: string
  objectives: string[]
  equipment: string[]
  exercises: ContentExercise[]
  cooldown?: string
  tips?: string[]
}

export interface ContentExercise {
  id: string
  name: string
  description: string
  durationSeconds?: number
  repetitions?: number
  sets?: number
  restSeconds?: number
  videoUrl?: string
  imageUrl?: string
  instructions: string[]
}

export interface ContentSyncResult {
  success: boolean
  itemsSynced: number
  itemsFailed: number
  errors: string[]
}

export interface ContentAdapter {
  fetchPrograms(category?: string, page?: number, pageSize?: number): Promise<ContentProgram[]>
  fetchProgramById(externalId: string): Promise<ContentProgram | null>
  syncPrograms(organizationId: string): Promise<ContentSyncResult>
}

// Factory function to get content adapter
export function getContentAdapter(): ContentAdapter {
  const provider = process.env.CONTENT_PROVIDER || 'mock'

  switch (provider) {
    case 'mock':
      // Dynamic import to avoid bundling mock data in production
      return new MockContentAdapter()
    default:
      return new MockContentAdapter()
  }
}

// Mock content adapter for MVP
class MockContentAdapter implements ContentAdapter {
  private mockPrograms: ContentProgram[] = [
    {
      externalId: 'mock-speed-001',
      title: 'Hız ve Çeviklik Antrenmanı - Başlangıç',
      description: 'Temel hız ve çeviklik becerilerini geliştiren başlangıç seviye program.',
      category: 'Hız',
      difficultyLevel: 1,
      estimatedDurationMinutes: 30,
      thumbnailUrl: '/images/programs/speed-beginner.jpg',
      tags: ['hız', 'çeviklik', 'başlangıç'],
      content: {
        introduction: 'Bu program, temel hız ve çeviklik becerilerinizi geliştirmenize yardımcı olacak.',
        objectives: [
          'Temel sprint tekniğini öğrenmek',
          'Yön değiştirme becerilerini geliştirmek',
          'Reaksiyon süresini kısaltmak',
        ],
        equipment: ['Koniler', 'Kronometr'],
        exercises: [
          {
            id: 'ex-1',
            name: 'Isınma Koşusu',
            description: 'Hafif tempoda ısınma koşusu',
            durationSeconds: 300,
            instructions: ['Hafif tempoda 5 dakika koşu yapın', 'Nefes kontrolüne dikkat edin'],
          },
          {
            id: 'ex-2',
            name: '10m Sprint',
            description: '10 metre sprint çalışması',
            repetitions: 6,
            restSeconds: 60,
            instructions: ['Düşük start pozisyonu alın', 'Maksimum hızda 10m sprint yapın', 'Dinlenin ve tekrarlayın'],
          },
          {
            id: 'ex-3',
            name: 'Koni Slalom',
            description: 'Koniler arasında slalom koşusu',
            repetitions: 4,
            restSeconds: 45,
            instructions: ['5 koniyi 2m aralıklarla dizin', 'Koniler arasında hızla slalom yapın'],
          },
        ],
        cooldown: '5 dakika yürüyüş ve germe hareketleri',
        tips: ['Düzenli antrenman yapın', 'Uygun ayakkabı kullanın'],
      },
    },
    {
      externalId: 'mock-technical-001',
      title: 'Top Kontrolü - Temel Seviye',
      description: 'Ayak içi, ayak dışı ve taban ile top kontrol teknikleri.',
      category: 'Teknik',
      difficultyLevel: 1,
      estimatedDurationMinutes: 25,
      thumbnailUrl: '/images/programs/ball-control.jpg',
      tags: ['teknik', 'top kontrolü', 'başlangıç'],
      content: {
        introduction: 'Top kontrolü, futbolun en temel becerisidir.',
        objectives: [
          'Ayak içi ile top kontrolü',
          'Ayak dışı ile top kontrolü',
          'Taban ile top durdurma',
        ],
        equipment: ['Futbol topu', 'Koniler'],
        exercises: [
          {
            id: 'ex-1',
            name: 'Yerinde Top Sektirme',
            description: 'Topu ayak üstü ile sektirme',
            durationSeconds: 180,
            instructions: ['Topu ayak üstü ile sektirin', 'Mümkün olduğunca çok tekrar yapın'],
          },
          {
            id: 'ex-2',
            name: 'Duvar Pası ve Kontrol',
            description: 'Duvara pas atıp kontrol etme',
            repetitions: 20,
            instructions: ['Duvara pas atın', 'Gelen topu ayak içi ile kontrol edin'],
          },
        ],
        cooldown: 'Serbest top ile oynayın',
      },
    },
    {
      externalId: 'mock-endurance-001',
      title: 'Dayanıklılık Geliştirme Programı',
      description: 'Aerobik kapasiteyi artıran dayanıklılık antrenmanı.',
      category: 'Dayanıklılık',
      difficultyLevel: 2,
      estimatedDurationMinutes: 45,
      thumbnailUrl: '/images/programs/endurance.jpg',
      tags: ['dayanıklılık', 'kondisyon', 'orta seviye'],
      content: {
        introduction: 'Bu program, 90 dakikalık bir maç boyunca performansınızı sürdürmenize yardımcı olur.',
        objectives: [
          'Aerobik kapasiteyi artırmak',
          'Toparlanma süresini kısaltmak',
          'Mental dayanıklılığı geliştirmek',
        ],
        equipment: ['Saha', 'Kronometr'],
        exercises: [
          {
            id: 'ex-1',
            name: 'Interval Koşusu',
            description: 'Değişken tempolu koşu',
            sets: 5,
            durationSeconds: 180,
            restSeconds: 90,
            instructions: ['3 dakika yüksek tempo koşu', '90 saniye aktif dinlenme'],
          },
        ],
      },
    },
  ]

  async fetchPrograms(category?: string, page = 1, pageSize = 10): Promise<ContentProgram[]> {
    let filtered = this.mockPrograms

    if (category) {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase())
    }

    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }

  async fetchProgramById(externalId: string): Promise<ContentProgram | null> {
    return this.mockPrograms.find(p => p.externalId === externalId) || null
  }

  async syncPrograms(organizationId: string): Promise<ContentSyncResult> {
    // Mock sync - in production this would sync from external API
    console.log(`Syncing programs for organization: ${organizationId}`)

    return {
      success: true,
      itemsSynced: this.mockPrograms.length,
      itemsFailed: 0,
      errors: [],
    }
  }
}
