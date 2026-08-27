(function renderGoomba() {
    const canvas = document.getElementById("glCanvas2");
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) return;

    // 1. VÉRTICES
    const vertices = new Float32Array([
        -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 2. VERTEX SHADER
    const vertexShaderSource = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;
    void main() {
        vUv = aPosition;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
    `;

    // 3. FRAGMENT SHADER
    const fragmentShaderSource = `#version 300 es
    precision mediump float;

    in vec2 vUv;
    out vec4 outColor;

    // Distância de Círculo
    float circle(vec2 p, vec2 center, float radius) {
        return length(p - center) - radius;
    }

    // Distância de Caixa/Retângulo (para sobrancelhas e pés)
    float sdBox(vec2 p, vec2 center, vec2 b) {
        vec2 d = abs(p - center) - b;
        return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
    }

    // Rotação para inclinar as sobrancelhas brabas
    vec2 rotate(vec2 p, float angle) {
        float c = cos(angle);
        float s = sin(angle);
        return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
    }

    void main() {
        vec2 st = vUv;

        // Cor de Fundo - verde
        vec3 color = vec3(0.4, 0.75, 0.35);

        // Cores do Goomba
        vec3 brown = vec3(0.55, 0.25, 0.08);
        vec3 skin = vec3(0.96, 0.82, 0.64);
        vec3 black = vec3(0.0, 0.0, 0.0);
        vec3 white = vec3(1.0, 1.0, 1.0);

        // 1. Pés (Dois elipses ovais na base)
        float leftFoot = circle(st * vec2(0.8, 1.3), vec2(-0.25, -0.45), 0.18);
        float rightFoot = circle(st * vec2(0.8, 1.3), vec2(0.25, -0.45), 0.18);

        // 2. Corpo
        float stem = circle(st * vec2(1.2, 0.9), vec2(0.0, -0.2), 0.32);

        // 3. Cabeça 
        float head = circle(st * vec2(1.0, 1.15), vec2(0.0, 0.15), 0.45);

        // 4. Olhos (Elipses brancas com pupilas pretas)
        float eyeL = circle(st * vec2(1.4, 0.7), vec2(-0.15, 0.1), 0.09);
        float eyeR = circle(st * vec2(1.4, 0.7), vec2(0.15, 0.1), 0.09);
        float pupilL = circle(st * vec2(1.6, 0.7), vec2(-0.10, 0.12), 0.04);
        float pupilR = circle(st * vec2(1.6, 0.7), vec2(0.10, 0.12), 0.04);

        // 5. Sobrancelhas zangadas (Caixas inclinadas)
        vec2 pBrowL = rotate(st - vec2(-0.15, 0.22), -0.35);
        float browL = sdBox(pBrowL, vec2(0.0), vec2(0.14, 0.035));

        vec2 pBrowR = rotate(st - vec2(0.15, 0.22), 0.35);
        float browR = sdBox(pBrowR, vec2(0.0), vec2(0.14, 0.035));

        // COMPOSIÇÃO DE CAMADAS (Trás para a frente)
        if (leftFoot < 0.0 || rightFoot < 0.0) color = black;
        if (stem < 0.0 && st.y < 0.05) color = skin;
        if (head < 0.0 && st.y > -0.15) color = brown;
        if (eyeL < 0.0 || eyeR < 0.0) color = white;
        if (pupilL < 0.0 || pupilR < 0.0) color = black;
        if (browL < 0.0 || browR < 0.0) color = black;

        outColor = vec4(color, 1.0);
    }
    `;

    // COMPILAÇÃO & LINKS
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
})();