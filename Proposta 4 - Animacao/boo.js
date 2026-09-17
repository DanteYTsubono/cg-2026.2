class Boo {
    constructor(tx, ty, speed, rotationSpeed = 0.03, Cor = [0.95, 0.95, 1.0]) {
        this.tx = tx;
        this.ty = ty;
        this.speed = speed;
        this.rotationSpeed = rotationSpeed
        this.Cor = new Float32Array(Cor);
        this.angle = 0;

        const vertices = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5
        ]);

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const vs = `#version 300 es
        in vec2 aPosition;
        out vec2 vUv;
        uniform mat3 u_viewTransform;
        uniform mat3 u_modelTransform;

        void main() {
            vUv = aPosition;
            vec3 pos = u_viewTransform * u_modelTransform * vec3(aPosition, 1.0);
            gl_Position = vec4(pos.xy, 0.0, 1.0);
        }`;

        const fs = `#version 300 es
        precision mediump float;
        in vec2 vUv;
        out vec4 outCor;
        
        uniform float u_angle;
        uniform vec3 u_corpoCor; 

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
            float c = cos(u_angle);
            float s = sin(u_angle);
            mat2 rot = mat2(c, -s, s, c);
            vec2 st = rot * vUv;

            vec3 Cor = vec3(0.0);
            float alpha = 0.0;

            float corpo = circle(st, vec2(0.0, -0.05), 0.35);
            float olhoEsq = circle(st, vec2(-0.12, 0.08), 0.03);
            float olhoDir = circle(st, vec2(0.12, 0.08), 0.03);
            float boca = circle(st * vec2(0.8, 1.2), vec2(0.0, -0.1), 0.15);
            
            float dente1 = sdTriangle(st, vec2(-0.09, -0.03), vec2(-0.04, -0.03), vec2(-0.065, -0.1));
            float dente2 = sdTriangle(st, vec2(0.04, -0.03), vec2(0.09, -0.03), vec2(0.065, -0.1));
            float dente3 = sdTriangle(st, vec2(-0.03, -0.18), vec2(0.03, -0.18), vec2(0.0, -0.1));

            if (corpo < 0.0) { Cor = u_corpoCor; alpha = 1.0; }
            if (boca < 0.0 && st.y < -0.01) { Cor = vec3(0.6, 0.0, 0.1); alpha = 1.0; }
            if (dente1 < 0.0 || dente2 < 0.0 || dente3 < 0.0) { Cor = vec3(1.0, 1.0, 1.0); alpha = 1.0; }
            if (olhoEsq < 0.0 || olhoDir < 0.0) { Cor = vec3(0.0, 0.0, 0.0); alpha = 1.0; }

            if (alpha == 0.0) discard;

            outCor = vec4(Cor, alpha);
        }`;

        this.program = createProgram(gl, vs, fs);
        this.posLoc = gl.getAttribLocation(this.program, "aPosition");
        this.modelLoc = gl.getUniformLocation(this.program, "u_modelTransform");
        this.viewLoc = gl.getUniformLocation(this.program, "u_viewTransform");
        this.angleLoc = gl.getUniformLocation(this.program, "u_angle");
        this.CorLoc = gl.getUniformLocation(this.program, "u_corpoCor");

        this.modelTransform = m3.identity();
    }

    update() {
        this.tx += this.speed;
        this.angle += this.rotationSpeed;

        if (this.tx > 1.6 || this.tx < -1.6) {
            this.speed = -this.speed;
        }

        const dir = this.speed > 0 ? 1 : -1;
        
        this.modelTransform = m3.multiply(
            m3.translation(this.tx, this.ty),
            m3.scaling(dir, 1)
        );
    }

    draw(renderer) {
        gl.useProgram(this.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.posLoc);
        gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);

        gl.uniformMatrix3fv(this.modelLoc, false, this.modelTransform);
        gl.uniformMatrix3fv(this.viewLoc, false, renderer.viewTransform);
        gl.uniform1f(this.angleLoc, this.angle);
        
        gl.uniform3fv(this.CorLoc, this.Cor);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}