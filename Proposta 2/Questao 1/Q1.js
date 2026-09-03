const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2", { preserveDrawingBuffer: true });

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

const canvasCoordinates = document.getElementById("canvasCoordinates");
const webglCoordinates = document.getElementById("webglCoordinates");

// 1. Variaveis globais
let segundoClick = false;

// Cores RGB
const paletaCores = [
[1.0, 1.0, 1.0], //0. branco    
[1.0, 0.0, 0.0], //1. vermelho
[1.0, 0.5, 0.0], //2. laranja
[1.0, 1.0, 0.0], //3. amarelo
[0.0, 1.0, 0.0], //4. verde
[0.0, 1.0, 1.0], //5. cian
[0.0, 0.0, 1.0], //6. azul
[0.5, 0.0, 0.5], //7. roxo
[1.0, 0.0, 1.0], //8. magenta
[0.5, 0.5, 0.5], //9. cinza
];

let corAtual = paletaCores[0]; // Começa com índice 0 (cinza)

let p1 = null;
let p2 = null;

let vertices = new Float32Array([]);
let colors = new Float32Array([]);
let pointSizes = new Float32Array([]);


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
    
    return pontos;
}

function gerarDadosLinha(pontoA, pontoB) {
    const pontosPixels = bresenham(pontoA.x, pontoA.y, pontoB.x, pontoB.y);
    const qtdPontos = pontosPixels.length / 2;

    const listaVertices = [];
    const listaCores = [];
    const listaTamanhos = [];

    for (let i = 0; i < pontosPixels.length; i += 2) {
        const px = pontosPixels[i];
        const py = pontosPixels[i + 1];

        // Pixel pra WebGL [-1, 1]
        const webglX = (px / canvas.width) * 2 - 1;
        const webglY = -((py / canvas.height) * 2 - 1);

        listaVertices.push(webglX, webglY);
        listaCores.push(corAtual[0], corAtual[1], corAtual[2]);
        listaTamanhos.push(2.0);
    }

    vertices = new Float32Array(listaVertices);
    colors = new Float32Array(listaCores);
    pointSizes = new Float32Array(listaTamanhos);

    // Atualiza os buffers na GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, pointSizesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointSizes, gl.STATIC_DRAW);
}

// 3. BUFFERS
const verticesBuffer = gl.createBuffer();
const colorsBuffer = gl.createBuffer();
const pointSizesBuffer = gl.createBuffer();


// 4. VERTEX SHADERS
const vertexShaderSource = `#version 300 es

in vec2 aPosition;
in vec3 aColor;
in float aPointSize;

out vec3 vColor;

void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = aPointSize;
    vColor = aColor;
}
`;

// 5. FRAGMENT SHADER
const fragmentShaderSource = `#version 300 es
precision mediump float;

in vec3 vColor;
out vec4 outColor;

void main() {
    outColor = vec4(vColor, 1.0);
}
`;


// 6. COMPILAR SHADERS
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const vertexShader = createShader(
    gl,
    gl.VERTEX_SHADER,
    vertexShaderSource
);

const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// 7. Atributos
const positionLocation =
    gl.getAttribLocation(
        program,
        "aPosition"
    );

const colorLocation =
    gl.getAttribLocation(
        program,
        "aColor"
    );

const pointSizeLocation =
    gl.getAttribLocation(
        program,
        "aPointSize"
    );

// 8. Configurar Atributos
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.enableVertexAttribArray(colorLocation);
gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);

gl.bindBuffer(gl.ARRAY_BUFFER, pointSizesBuffer);
gl.enableVertexAttribArray(pointSizeLocation);
gl.vertexAttribPointer(pointSizeLocation, 1, gl.FLOAT, false, 0, 0);


// 9. Interação com mouse
canvas.addEventListener("mousedown", mouseClick, false);

function mouseClick(event) {
    const x = event.offsetX;
    const y = event.offsetY;

    if (canvasCoordinates) canvasCoordinates.textContent = `Canvas: (${x}, ${y})`;

    if (p1 === null) {
        // Primeiro click: P1
        p1 = { x, y };
    } else {
        // Segundo click: P2
        p2 = { x, y };
        gerarDadosLinha(p1, p2);
        drawScene();

        // Reseta para a próxima linha
        p1 = null;
        p2 = null;
    }
}

// 10 Interação teclado

window.addEventListener("keydown", (event) => {
    const tecla = parseInt(event.key);

    if (!isNaN(tecla) && tecla >= 0 && tecla <= 9) {
        corAtual = paletaCores[tecla];

        if (vertices.length > 0) {
            const listaCores = [];
            const qtdPontos = vertices.length / 2;

            for (let i = 0; i < qtdPontos; i++) {
                listaCores.push(corAtual[0], corAtual[1], corAtual[2]);
            }

            colors = new Float32Array(listaCores);
            gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

            drawScene();
        }
    }
});

// Renderização
gl.clearColor(0.1, 0.1, 0.1, 1.0);

function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.POINTS, 0, vertices.length / 2);
}

// Ponto Inicial (0,0) ate (0,0)
const centroX = Math.round(canvas.width / 2);
const centroY = Math.round(canvas.height / 2);
gerarDadosLinha({ x: centroX, y: centroY }, { x: centroX, y: centroY });
drawScene();