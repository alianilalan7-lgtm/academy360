'use client'

interface ConfettiProps {
    isActive: boolean
}

export function Confetti({ isActive }: ConfettiProps) {
    if (!isActive) return null

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-3 h-3 animate-confetti"
                    style={{
                        left: `${Math.random() * 100}%`,
                        backgroundColor: ['#10B981', '#3B82F6', '#F97316', '#8B5CF6', '#EF4444', '#F59E0B'][
                            Math.floor(Math.random() * 6)
                        ],
                        animationDelay: `${Math.random() * 0.5}s`,
                        animationDuration: `${2 + Math.random()}s`,
                    }}
                />
            ))}
            <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
        </div>
    )
}
