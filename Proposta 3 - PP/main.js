const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// --------------------------------------------------
// CONFIGURAÇÕES E DIMENSÕES DOS OBJETOS
// --------------------------------------------------
const BAR_WIDTH = 0.1;   // Largura da barra (-0.05 até 0.05)
const BAR_HEIGHT = 0.4;  // Altura da barra (-0.2 até 0.2)
const BALL_RADIUS = 0.05;

// Posições X fixas das barras no espaço WebGL [-1, 1]
const POS_X_ESQUERDA = -0.9;
const POS_X_DIREITA = 0.9;

// --------------------------------------------------
// VERTICES E CORES
// --------------------------------------------------
function verticesBarra() {
    return new Float32Array([
        -0.05,  0.2,
        -0.05, -0.2,
         0.05,  0.2,
         0.05,  0.2,
        -0.05, -0.2,
         0.05, -0.2
    ]);
}

function verticesBola() {
    let vertices = [];
    let numSegments = 30;

    for (let i = 0; i < numSegments; i++) {
        let theta1 = (i / numSegments) * 2 * Math.PI;
        let theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(0, 0); 
        vertices.push(BALL_RADIUS * Math.cos(theta1), BALL_RADIUS * Math.sin(theta1));
        vertices.push(BALL_RADIUS * Math.cos(theta2), BALL_RADIUS * Math.sin(theta2));
    }

    return new Float32Array(vertices);
}

let verticesBarraDireita = verticesBarra();
let corBarraDireita = new Float32Array([0.0, 0.0, 1.0]); // Azul

let verticesBarraEsquerda = verticesBarra();
let corBarraEsquerda = new Float32Array([0.0, 1.0, 0.0]); // Verde

let verticesBolaCentro = verticesBola();
let corBolaCentro = new Float32Array([1.0, 0.0, 0.0]); // Inicialmente Vermelho

// --------------------------------------------------
// ESTADO DO JOGO E PARÂMETROS DE VELOCIDADE
// --------------------------------------------------
let tyBE = 0.0; // Posição Y da Barra Esquerda
let tyBD = 0.0; // Posição Y da Barra Direita

let txBola = 0.0;
let tyBola = 0.0;
let txBola_offset = 0.005; // Velocidade inicial X
let tyBola_offset = 0.002; // Velocidade inicial Y

const velocidadeBarra = 0.015; // Velocidade de movimento das barras

// Mapeamento de Teclas Pressionadas
const keysPressed = {};

window.addEventListener("keydown", (e) => {
    keysPressed[e.key] = true;
});

window.addEventListener("keyup", (e) => {
    keysPressed[e.key] = false;
});

// Matrizes de Transformação
let MbarraEsquerda = m3.translation(POS_X_ESQUERDA, tyBE);
let MbarraDireita = m3.translation(POS_X_DIREITA, tyBD);
let MbolaCentro = m3.identity();

// --------------------------------------------------
// SHADERS & BUFFERS
// --------------------------------------------------
const verticesBuffer = gl.createBuffer();

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 u_transform;
out vec3 vColor;

void main() {
    vec3 position = u_transform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;

void main() {
    outColor = vec4(uColor, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");

// --------------------------------------------------
// FUNÇÕES AUXILIARES DE SORTEIO (RANDOM)
// --------------------------------------------------
function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function mudarCorBola() {
    // Garante componentes com brilho (pelo menos um canal em tom mais vivo)
    corBolaCentro = new Float32Array([
        randomRange(0.2, 1.0), // R
        randomRange(0.2, 1.0), // G
        randomRange(0.2, 1.0)  // B
    ]);
}

function randomizarVelocidadeBola(direcaoX) {
    // direcaoX: 1 para a direita, -1 para a esquerda
    const baseSpeedX = 0.005;
    const fatorX = randomRange(0.85, 1.25); // Varia de 85% a 125% da velocidade X
    txBola_offset = direcaoX * (baseSpeedX * fatorX);

    // Varia a velocidade Y aleatoriamente entre -0.004 e 0.004
    tyBola_offset = randomRange(-0.004, 0.004);
}

function resetBola() {
    txBola = 0.0;
    tyBola = 0.0;
    // Reseta velocidades base e inverte a direção
    txBola_offset = (txBola_offset > 0 ? -1 : 1) * 0.005;
    tyBola_offset = 0.002;
    corBolaCentro = new Float32Array([1.0, 0.0, 0.0]); // Volta a ser vermelha
}

// --------------------------------------------------
// MOVIMENTAÇÃO E COLISÕES
// --------------------------------------------------
function processaTeclas() {
    // Barra Esquerda: W (sobe) / S (desce)
    if (keysPressed["w"] || keysPressed["W"]) {
        tyBE = Math.min(tyBE + velocidadeBarra, 1.0 - BAR_HEIGHT / 2);
    }
    if (keysPressed["s"] || keysPressed["S"]) {
        tyBE = Math.max(tyBE - velocidadeBarra, -1.0 + BAR_HEIGHT / 2);
    }

    // Barra Direita: Seta Cima (sobe) / Seta Baixo (desce)
    if (keysPressed["ArrowUp"]) {
        tyBD = Math.min(tyBD + velocidadeBarra, 1.0 - BAR_HEIGHT / 2);
    }
    if (keysPressed["ArrowDown"]) {
        tyBD = Math.max(tyBD - velocidadeBarra, -1.0 + BAR_HEIGHT / 2);
    }

    // Atualiza matrizes das barras
    MbarraEsquerda = m3.translation(POS_X_ESQUERDA, tyBE);
    MbarraDireita = m3.translation(POS_X_DIREITA, tyBD);
}

function atualizaAnimacao() {
    processaTeclas();

    // Atualiza posição da bola
    txBola += txBola_offset;
    tyBola += tyBola_offset;

    // 1. Colisão Teto e Chão
    if (tyBola + BALL_RADIUS > 1.0 || tyBola - BALL_RADIUS < -1.0) {
        tyBola_offset = -tyBola_offset;
    }

    // 2. Colisão com a Barra Esquerda
    if (txBola - BALL_RADIUS <= POS_X_ESQUERDA + BAR_WIDTH / 2 && txBola > POS_X_ESQUERDA) {
        if (tyBola >= tyBE - BAR_HEIGHT / 2 && tyBola <= tyBE + BAR_HEIGHT / 2) {
            randomizarVelocidadeBola(1); // Rebate para a direita
            mudarCorBola();             // Altera a cor RGB
        }
    }

    // 3. Colisão com a Barra Direita
    if (txBola + BALL_RADIUS >= POS_X_DIREITA - BAR_WIDTH / 2 && txBola < POS_X_DIREITA) {
        if (tyBola >= tyBD - BAR_HEIGHT / 2 && tyBola <= tyBD + BAR_HEIGHT / 2) {
            randomizarVelocidadeBola(-1); // Rebate para a esquerda
            mudarCorBola();              // Altera a cor RGB
        }
    }

    // 4. Detecção de Gol (Bola saiu das laterais)
    if (txBola > 1.1) {
        console.log("Ponto do Jogador Esquerdo!");
        resetBola();
    } else if (txBola < -1.1) {
        console.log("Ponto do Jogador Direito!");
        resetBola();
    }

    MbolaCentro = m3.translation(txBola, tyBola);
}

// --------------------------------------------------
// RENDERIZAÇÃO
// --------------------------------------------------
const numComponents = 2;

function drawScene() {
    atualizaAnimacao();

    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    drawObjeto(verticesBarraEsquerda, corBarraEsquerda, MbarraEsquerda);
    drawObjeto(verticesBarraDireita, corBarraDireita, MbarraDireita);
    drawObjeto(verticesBolaCentro, corBolaCentro, MbolaCentro);

    requestAnimationFrame(drawScene);
}

function drawObjeto(vertices, cor, matriz) {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform3fv(colorLocation, cor);
    gl.uniformMatrix3fv(transformLocation, false, matriz);

    gl.drawArrays(gl.TRIANGLES, 0, vertices.length / numComponents);
}

// Inicia o loop do jogo
drawScene();