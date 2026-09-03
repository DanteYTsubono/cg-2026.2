(function renderBoo() {
    const canvas = document.getElementById("glCanvas1");
    if (!canvas) return;

    const gl = canvas.getContext("webgl2");
    if (!gl) {
        console.error("WebGL 2 não é suportado.");
        return;
    }

    // 1. VÉRTICES (Retângulo base)
    const vertices = new Float32Array([
        -1.0, -1.0, 
         1.0, -1.0,
        -1.0,  1.0, // Triangulo retangulo, inferior esquerdo

        -1.0,  1.0,
         1.0, -1.0,
         1.0,  1.0, // Triangulo retangulo, superior direito
    ]);

    // 2. BUFFER
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    // 3. VERTEX SHADER
    const vertexShaderSource = `#version 300 es
    in vec2 aPosition;
    out vec2 vUv;

    void main() {
        vUv = aPosition;
        gl_Position = vec4(aPosition, 0.0, 1.0);
    }
    `;

    // 4. FRAGMENT SHADER (Desenho)
    const fragmentShaderSource = `#version 300 es
    precision mediump float;

    in vec2 vUv;
    out vec4 outColor;

    float circle(vec2 p, vec2 center, float radius) {
        return length(p - center) - radius;
    }

    float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
        vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2;
        vec2 v0 = p - p0, v1 = p - p1, v2 = p - p2;
        vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0);
        vec2 pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0);
        vec2 pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
        float s = sign(e0.x * e2.y - e0.y * e2.x);
        vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)),
                         vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))),
                         vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
        return -sqrt(d.x) * sign(d.y);
    }

    void main() {
        vec2 st = vUv;
        vec3 color = vec3(0.08, 0.05, 0.15);

        float body = circle(st, vec2(0.0, -0.05), 0.55);
        float leftEye = circle(st, vec2(-0.2, 0.15), 0.05);
        float rightEye = circle(st, vec2(0.2, 0.15), 0.05);
        float mouthBg = circle(st * vec2(0.8, 1.2), vec2(0.0, -0.15), 0.25);
        
        float tooth1 = sdTriangle(st, vec2(-0.14, -0.05), vec2(-0.06, -0.05), vec2(-0.10, -0.16));
        float tooth2 = sdTriangle(st, vec2(0.06, -0.05), vec2(0.14, -0.05), vec2(0.10, -0.16));
        float tooth3 = sdTriangle(st, vec2(-0.05, -0.28), vec2(0.05, -0.28), vec2(0.0, -0.16));

        if (body < 0.0) color = vec3(0.95, 0.95, 1.0);
        if (mouthBg < 0.0 && st.y < -0.02) color = vec3(0.6, 0.0, 0.1);
        if (tooth1 < 0.0 || tooth2 < 0.0 || tooth3 < 0.0) color = vec3(1.0, 1.0, 1.0);
        if (leftEye < 0.0 || rightEye < 0.0) color = vec3(0.0, 0.0, 0.0);

        outColor = vec4(color, 1.0);
    }
    `;

    // 5. COMPILAÇÃO
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // 6. PROGRAMA
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // 7. CONFIGURAÇÃO DE ATRIBUTO
    const positionLocation = gl.getAttribLocation(program, "aPosition");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // 8. RENDER
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
})();