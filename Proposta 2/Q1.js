// 1. Variaveis globais

// Pontos Iniciais
let p1 = { x: 0, y: 0};
let p2 = { x: 0, y: 0};
let segundoClick = false;

// Cores RGB
const paletaCores = [
[1.0, 0.0, 0.0], //1. vermelho
[1.0, 0.5, 0.0], //2. laranja
[1.0, 1.0, 0.0], //3. amarelo
[0.0, 1.0, 0.0], //4. verde
[0.0, 1.0, 1.0], //5. cian
[0.0, 0.0, 1.0], //6. azul
[0.5, 0.0, 0.5], //7. roxo
[1.0, 0.0, 1.0], //8. magenta
[1.0, 1.0, 1.0], //9. branco
[0.5, 0.5, 0.5], //0. cinza
];

let corAtual = paletaCores[0]; // Começa com índice 0 (cinza)


// 2. Bresenham
//mini glossário: d (distance), s (step)

function bresenham(x0, y0, x1, y1) {
    const pontos = [];
    
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        pontos.push(x0, y0); // adiciona o novo pixel

        if (x0 === x1 && y0 === y1) break;
        
        let e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
    
    return pontos; // Array com coordenadas [x1, y1, x2, y2, ...]
}