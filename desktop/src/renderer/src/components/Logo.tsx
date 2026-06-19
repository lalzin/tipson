// Logo TIPSON (monogramme TS, même tracé que l'app web).
const T_PATH = 'M250 2597 l0 -244 173 -6 c94 -4 219 -7 277 -7 166 0 176 -8 131 -98 -159 -316 -161 -680 -4 -984 142 -276 417 -489 701 -544 46 -9 140 -14 253 -14 159 0 184 2 218 20 79 40 116 112 109 211 -5 73 -44 133 -108 169 -41 22 -60 25 -200 31 -185 7 -252 25 -361 98 -128 84 -206 185 -256 328 -23 68 -27 93 -27 193 0 98 4 126 26 188 55 152 148 267 274 338 133 75 134 75 729 77 l530 2 0 240 0 240 -1232 3 -1233 2 0 -243z'
const S_PATH = 'M1695 1931 c-83 -38 -125 -106 -125 -199 0 -75 31 -136 89 -177 41 -29 46 -30 199 -37 170 -7 230 -22 347 -80 77 -39 200 -162 242 -243 175 -334 16 -731 -342 -853 l-80 -27 -512 -3 -513 -3 0 -155 0 -154 723 0 722 0 58 38 c312 208 497 598 459 965 -40 372 -252 677 -587 844 -154 77 -279 103 -494 103 -121 0 -153 -4 -186 -19z'

export function LogoBadge({ size = 80, rounded = 22 }: { size?: number; rounded?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-label="TIPSON">
      <defs>
        <linearGradient id="tipson-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx={rounded} fill="url(#tipson-logo-grad)" />
      <g transform="translate(50 50) scale(0.2183) translate(-135.83 -142.00)" fill="#ffffff">
        <g transform="translate(-25 284.007873) scale(0.1 -0.1)" stroke="none">
          <path d={T_PATH} />
          <path d={S_PATH} />
        </g>
      </g>
    </svg>
  )
}
