// ==================================================
// CLASS - SCENE
// ==================================================

class Scene {

    constructor(gl, program) {

        this.renderer = new Renderer(gl, program);

        // Instância dos objetos
        this.helicopterBody = new HelicopterBody();
        this.helicopterTopShaft = new HelicopterTopShaft();
        this.helicopterTail = new HelicopterTail();
        this.helicopterPropellers = new HelicopterPropellers();
        this.helicopterTailPropeller = new HelicopterTailPropeller();

        // Posição global do helicóptero
        this.posX = 0.0;
        this.posY = 0.0;
        this.posZ = 0.0;
        this.speed = 0.015;

        // Fator de escala (Altere este valor para diminuir/aumentar o tamanho)
        this.rotationY = 0.0;
        this.turnSpeed = 0.05;
        this.scale = 0.5; // 0.5 reduz o helicóptero para metade do tamanho original

        // Ângulos e velocidades de rotação das hélices
        this.mainRotorAngle = 0.0;
        this.tailRotorAngle = 0.0;
        this.mainRotorSpeed = 0.015;
        this.tailRotorSpeed = 0.03;

        // Controle do teclado
        this.keys = {};
        
        // Escuta os eventos de teclado da janela
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }

    handleInput() {
        // Movimentação pelas setas
        if (this.keys['ArrowUp'])    this.posY += this.speed;
        if (this.keys['ArrowDown'])  this.posY -= this.speed;
        if (this.keys['ArrowLeft'])  this.rotationY -= this.turnSpeed;
        if (this.keys['ArrowRight']) this.rotationY += this.turnSpeed;
    }

    update() {
        // 1. Processa entrada do teclado e incrementa rotações
        this.handleInput();
        this.mainRotorAngle += this.mainRotorSpeed;
        this.tailRotorAngle += this.tailRotorSpeed;

        // 2. Matriz Base: Translação * Escala
        // Aplica a escala logo após a translação para encolher o modelo mantendo a posição centralizada
        let mBody = m4.translation(this.posX, this.posY, this.posZ);
        mBody = m4.multiply(mBody, m4.yRotation(this.rotationY));
        mBody = m4.multiply(mBody, m4.scaling(this.scale, this.scale, this.scale));

        // 3. Matriz da Hélice Superior (Base Global * Rotação em Y)
        const mPropeller = m4.multiply(mBody, m4.yRotation(this.mainRotorAngle));

        // 4. Matriz da Hélice da Cauda (Aplica rotação local no pivô da cauda)
        const px = 0.7, py = 0.0, pz = 0.055;
        let mTailPropeller = m4.multiply(mBody, m4.translation(px, py, pz));
        mTailPropeller = m4.multiply(mTailPropeller, m4.zRotation(this.tailRotorAngle));
        mTailPropeller = m4.multiply(mTailPropeller, m4.translation(-px, -py, -pz));

        // 5. Envia as matrizes para cada objeto
        this.helicopterBody.update(mBody);
        this.helicopterTopShaft.update(mBody);
        this.helicopterTail.update(mBody);
        this.helicopterPropellers.update(mPropeller);
        this.helicopterTailPropeller.update(mTailPropeller);
    }

    draw() {

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
        );

        gl.useProgram(program);

        this.helicopterBody.draw(this.renderer);
        this.helicopterTopShaft.draw(this.renderer);
        this.helicopterTail.draw(this.renderer);
        this.helicopterPropellers.draw(this.renderer);
        this.helicopterTailPropeller.draw(this.renderer);
    }

    execute() {

        this.update();
        this.draw();

        requestAnimationFrame(
            () => this.execute()
        );
    }

    init() {

        requestAnimationFrame(
            () => this.execute()
        );
    }
}