class TableroAjedrez {
    constructor() {
        this.piezaArrastrada = null;
        this.posicionInicial = null;
        this.turnoActual = 'blanca';
        this.contadorMovimientos = 0;
        this.estadoJuego = 'en-curso';
        this.piezasCapturadas = {
            blanca: [],
            negra: []
        };
        this.valoresPiezas = {
            peon: 1,
            caballo: 3,
            alfil: 3,
            torre: 5,
            reina: 9,
            rey: 0
        };
        this.inicializar();
    }

    async inicializar() {
        this.verificarElementos();
        this.configurarNuevaPartida();
        this.configurarRendicion();
        this.configurarModales();
        await this.sincronizarEstado();
        this.configurarDragAndDrop();
        
        setTimeout(() => {
            this.actualizarTurno(this.turnoActual);
            this.actualizarContador();
            this.actualizarEstadoJuego();
        }, 100);
    }

    // Verificar que todos los elementos existen
    verificarElementos() {
        const elementos = [
            'nueva-partida',
            'turno-display', 
            'contador-movimientos'
        ];
        
        elementos.forEach(id => {
            const elemento = document.getElementById(id);
            if (!elemento) {
                console.error(`Elemento con ID '${id}' no encontrado`);
            } else {
                console.log(`Elemento '${id}' encontrado correctamente`);
            }
        });
    }

    // Sincronizar el turno con el servidor
    async sincronizarTurno() {
        try {
            const response = await fetch('/turno-actual');
            const data = await response.json();
            if (data.turno) {
                this.actualizarTurno(data.turno);
                console.log('Turno sincronizado desde servidor:', data.turno);
            }
        } catch (error) {
            console.error('Error al sincronizar turno:', error);
        }
    }

    configurarNuevaPartida() {
        const botonNuevaPartida = document.getElementById('nueva-partida');
        if (botonNuevaPartida) {
            botonNuevaPartida.addEventListener('click', () => {
                const confirmacion = confirm('¿Estás seguro de que quieres iniciar una nueva partida? Se perderá el progreso actual.');
                
                if (confirmacion) {
                    this.iniciarNuevaPartida();
                }
            });
        } else {
            console.error('Botón nueva-partida no encontrado');
        }
    }

    configurarRendicion() {
        const botonRendirse = document.getElementById('rendirse');
        if (botonRendirse) {
            botonRendirse.addEventListener('click', () => {
                if (this.estadoJuego !== 'en-curso') {
                    alert('La partida ya ha terminado');
                    return;
                }
                this.mostrarModalRendicion();
            });
        }
    }

    configurarModales() {
        // Modal de confirmación de rendición
        const confirmSurrender = document.getElementById('confirm-surrender');
        const cancelSurrender = document.getElementById('cancel-surrender');
        
        if (confirmSurrender) {
            confirmSurrender.addEventListener('click', () => {
                this.confirmarRendicion();
            });
        }
        
        if (cancelSurrender) {
            cancelSurrender.addEventListener('click', () => {
                this.ocultarModal('surrender-modal');
            });
        }

        // Modal de fin de juego
        const newGameFromModal = document.getElementById('new-game-from-modal');
        const closeModal = document.getElementById('close-modal');
        
        if (newGameFromModal) {
            newGameFromModal.addEventListener('click', () => {
                this.iniciarNuevaPartida();
                this.ocultarModal('game-over-modal');
            });
        }
        
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.ocultarModal('game-over-modal');
            });
        }
    }

    mostrarModalRendicion() {
        const modal = document.getElementById('surrender-modal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    ocultarModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    async confirmarRendicion() {
        try {
            console.log('Intentando rendirse. Jugador actual:', this.turnoActual);
            
            const response = await fetch('/rendirse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jugador: this.turnoActual
                })
            });

            console.log('Respuesta HTTP status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta del servidor (rendición):', data);

            if (data.success) {
                this.estadoJuego = data.estadoJuego;
                this.actualizarEstadoJuego();
                this.deshabilitarTablero();
                this.ocultarModal('surrender-modal');
                this.mostrarModalFinJuego(data.ganador, 'rendición');
            } else {
                alert(data.mensaje || 'Error al rendirse');
            }
        } catch (error) {
            console.error('Error completo al rendirse:', error);
            alert('Error al procesar la rendición. Revisa la consola para más detalles.');
        }
    }

    mostrarModalFinJuego(ganador, motivo) {
        const modal = document.getElementById('game-over-modal');
        const title = document.getElementById('game-over-title');
        const message = document.getElementById('game-over-message');

        if (modal && title && message) {
            title.textContent = '🏆 Fin del juego';
            
            let mensajeCompleto;
            if (motivo === 'rendición') {
                const perdedor = ganador === 'blancas' ? 'negras' : 'blancas';
                mensajeCompleto = `¡${ganador.charAt(0).toUpperCase() + ganador.slice(1)} ganan por rendición de ${perdedor}!`;
            } else {
                mensajeCompleto = `¡${ganador.charAt(0).toUpperCase() + ganador.slice(1)} ganan!`;
            }
            
            message.textContent = mensajeCompleto;
            modal.classList.add('show');
        }
    }

    actualizarEstadoJuego() {
        const estadoElement = document.getElementById('estado-juego');
        const botonRendirse = document.getElementById('rendirse');
        
        if (estadoElement) {
            estadoElement.className = ''; // Limpiar clases
            
            switch (this.estadoJuego) {
                case 'en-curso':
                    estadoElement.textContent = 'Partida en curso';
                    estadoElement.classList.add('en-curso');
                    if (botonRendirse) botonRendirse.disabled = false;
                    break;
                case 'blancas-ganan':
                    estadoElement.textContent = '🏆 Blancas ganan';
                    estadoElement.classList.add('ganador');
                    if (botonRendirse) botonRendirse.disabled = true;
                    break;
                case 'negras-ganan':
                    estadoElement.textContent = '🏆 Negras ganan';
                    estadoElement.classList.add('ganador');
                    if (botonRendirse) botonRendirse.disabled = true;
                    break;
                default:
                    estadoElement.textContent = 'Partida terminada';
                    estadoElement.classList.add('terminado');
                    if (botonRendirse) botonRendirse.disabled = true;
            }
        }
    }

    deshabilitarTablero() {
        const tablero = document.querySelector('.tablero');
        if (tablero) {
            tablero.classList.add('disabled');
        }
    }

    habilitarTablero() {
        const tablero = document.querySelector('.tablero');
        if (tablero) {
            tablero.classList.remove('disabled');
        }
    }

    async sincronizarEstado() {
        try {
            const response = await fetch('/estado-juego');
            const data = await response.json();
            
            if (data.turnoActual) {
                this.actualizarTurno(data.turnoActual);
            }
            
            if (data.estadoJuego) {
                this.estadoJuego = data.estadoJuego;
                this.actualizarEstadoJuego();
                
                if (data.estadoJuego !== 'en-curso') {
                    this.deshabilitarTablero();
                }
            }
        } catch (error) {
            console.error('Error al sincronizar estado:', error);
        }
    }

    async iniciarNuevaPartida() {
        const boton = document.getElementById('nueva-partida');
        try {
            if (boton) {
                boton.textContent = '⏳ Reiniciando...';
                boton.disabled = true;
            }

            const response = await fetch('/nueva-partida', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.contadorMovimientos = 0;
                this.piezasCapturadas = { blanca: [], negra: [] };
                this.estadoJuego = data.estadoJuego || 'en-curso';
                
                this.actualizarContador();
                this.actualizarTurno('blanca');
                this.actualizarEstadoJuego();
                this.habilitarTablero();
                
                // Limpiar bandejas de capturas
                const bandejas = ['white-captured-pieces', 'black-captured-pieces'];
                bandejas.forEach(id => {
                    const bandeja = document.getElementById(id);
                    if (bandeja) {
                        bandeja.innerHTML = '';
                        bandeja.classList.remove('has-pieces');
                    }
                });
                
                // Recargar la página para mostrar el tablero nuevo
                window.location.reload();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al iniciar nueva partida');
        } finally {
            if (boton) {
                boton.textContent = '🔄 Nueva Partida';
                boton.disabled = false;
            }
        }
    }

    actualizarTurno(turno) {
        this.turnoActual = turno;
        const turnoDisplay = document.getElementById('turno-display');
        
        if (turnoDisplay) {
            turnoDisplay.textContent = turno === 'blanca' ? 'Blancas' : 'Negras';
            turnoDisplay.style.color = turno === 'blanca' ? '#ffffff' : '#000000';
            turnoDisplay.style.backgroundColor = turno === 'blanca' ? '#054cb6' : '#212121';
            turnoDisplay.style.padding = '0.5rem 1rem';
            turnoDisplay.style.borderRadius = '0.5rem';
            turnoDisplay.style.fontWeight = 'bold';
            console.log('Turno actualizado a:', turno);
        } else {
            console.error('Elemento turno-display no encontrado');
        }
    }

    actualizarContador() {
        const contadorElement = document.getElementById('contador-movimientos');
        if (contadorElement) {
            contadorElement.textContent = this.contadorMovimientos;
            console.log('Contador actualizado a:', this.contadorMovimientos);
        } else {
            console.error('Elemento contador-movimientos no encontrado');
        }
    }

    configurarDragAndDrop() {
        // Cuando empieza a arrastrar una pieza
        document.querySelectorAll(".pieza").forEach(pieza => {
            pieza.addEventListener("dragstart", (e) => {
                this.piezaArrastrada = pieza;
                const casillaPadre = pieza.parentElement;
                this.posicionInicial = casillaPadre.getAttribute('data-pos');
                console.log('Posición inicial:', this.posicionInicial);
                setTimeout(() => pieza.style.display = "none", 0);
            });

            pieza.addEventListener("dragend", (e) => {
                pieza.style.display = "";
            });
        });

        // Habilita cada casilla como zona de "soltar"
        document.querySelectorAll(".casilla").forEach(casilla => {
            casilla.addEventListener("dragover", (e) => {
                e.preventDefault();
            });

            casilla.addEventListener("drop", (e) => {
                e.preventDefault();
                if (this.piezaArrastrada) {
                    this.manejarMovimiento(casilla);
                }
            });
        });
    }

    async manejarMovimiento(casilla) {
        // Verificar que el juego esté en curso
        if (this.estadoJuego !== 'en-curso') {
            console.log('El juego ha terminado');
            this.piezaArrastrada = null;
            return;
        }

        const posicionFinal = casilla.getAttribute('data-pos');
        const colorPieza = this.piezaArrastrada.getAttribute('data-color');
        
        console.log('Posición final:', posicionFinal);
        console.log('Color de la pieza detectado:', colorPieza);
        console.log('Turno actual:', this.turnoActual);

        // Verificar si hay una pieza en la casilla de destino (captura)
        const piezaCapturada = casilla.querySelector('.pieza');

        try {
            const response = await fetch('/validar-movimiento', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pieza: this.piezaArrastrada.dataset.tipo,
                    color: colorPieza,
                    inicial: this.posicionInicial,
                    final: posicionFinal
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Respuesta del servidor:', data);

            if (data.valido) {
                // Si hay una pieza capturada, agregarla a la bandeja
                if (piezaCapturada) {
                    this.capturarPieza(piezaCapturada);
                }

                // Mover la pieza si el movimiento es válido
                casilla.innerHTML = "";
                casilla.appendChild(this.piezaArrastrada);
                
                // Actualizar el turno local con el turno del servidor
                if (data.nuevoTurno) {
                    this.actualizarTurno(data.nuevoTurno);
                }
                
                this.contadorMovimientos++;
                this.actualizarContador();
            } else {
                console.log('Movimiento inválido:', data.mensaje);
                // Si el movimiento es inválido por turno, sincronizar con el servidor
                if (data.mensaje.includes('No es tu turno')) {
                    await this.sincronizarTurno();
                }
            }
        } catch (error) {
            console.error('Error al validar movimiento:', error);
        } finally {
            this.piezaArrastrada = null;
        }
    }

    capturarPieza(pieza) {
        const colorCapturado = pieza.getAttribute('data-color');
        const tipoPieza = pieza.dataset.tipo;
        const colorCapturador = colorCapturado === 'blanca' ? 'negra' : 'blanca';

        // Agregar a la lista de piezas capturadas
        this.piezasCapturadas[colorCapturador].push({
            tipo: tipoPieza,
            color: colorCapturado,
            svg: pieza.innerHTML
        });

        // Crear elemento para la bandeja
        this.agregarPiezaABandeja(tipoPieza, colorCapturado, pieza.innerHTML, colorCapturador);
        
        // Actualizar contadores y ventaja material
        this.actualizarEstadisticasCaptura();
    }

    agregarPiezaABandeja(tipoPieza, colorPieza, svgContent, colorCapturador) {
        const bandejaId = colorCapturador === 'blanca' ? 'white-captured-pieces' : 'black-captured-pieces';
        const bandeja = document.getElementById(bandejaId);

        if (bandeja) {
            // Crear elemento de pieza capturada
            const piezaCapturada = document.createElement('div');
            piezaCapturada.className = 'captured_piece new-capture';
            piezaCapturada.innerHTML = `
                ${svgContent}
                <div class="piece-value-indicator">${this.valoresPiezas[tipoPieza]}</div>
            `;

            // Agregar con animación
            bandeja.appendChild(piezaCapturada);
            bandeja.classList.add('has-pieces');

            // Efecto de destello
            setTimeout(() => {
                piezaCapturada.classList.add('glow-effect');
            }, 100);

            // Limpiar clases de animación
            setTimeout(() => {
                piezaCapturada.classList.remove('new-capture', 'glow-effect');
            }, 1500);

            // Agregar tooltip con información
            this.agregarTooltipPieza(piezaCapturada, tipoPieza, colorPieza);
        }
    }

    agregarTooltipPieza(elemento, tipo, color) {
        elemento.title = `${color === 'blanca' ? 'Blanca' : 'Negra'} ${this.nombresPiezas[tipo]} (Valor: ${this.valoresPiezas[tipo]})`;
    }

    actualizarEstadisticasCaptura() {
        // Actualizar contadores
        const whiteCount = document.getElementById('white-captures-count');
        const blackCount = document.getElementById('black-captures-count');
        
        if (whiteCount) whiteCount.textContent = this.piezasCapturadas.blanca.length;
        if (blackCount) blackCount.textContent = this.piezasCapturadas.negra.length;

        // Calcular ventaja material
        const ventajaBlanca = this.calcularVentajaMaterial('blanca');
        const ventajaNegra = this.calcularVentajaMaterial('negra');

        this.actualizarVentajaMaterial('white', ventajaBlanca);
        this.actualizarVentajaMaterial('black', ventajaNegra);
    }

    calcularVentajaMaterial(color) {
        return this.piezasCapturadas[color].reduce((total, pieza) => {
            return total + this.valoresPiezas[pieza.tipo];
        }, 0);
    }

    actualizarVentajaMaterial(color, ventaja) {
        const ventajaElement = document.getElementById(`${color}-advantage-value`);
        if (ventajaElement) {
            const ventajaOpuesta = color === 'white' ? 
                this.calcularVentajaMaterial('negra') : 
                this.calcularVentajaMaterial('blanca');
            
            const diferencia = ventaja - ventajaOpuesta;
            
            ventajaElement.textContent = diferencia > 0 ? `+${diferencia}` : 
                                       diferencia < 0 ? `${diferencia}` : '0';
            
            // Aplicar clases de color
            ventajaElement.className = 'advantage-value';
            if (diferencia > 0) {
                ventajaElement.classList.add('advantage-positive');
            } else if (diferencia < 0) {
                ventajaElement.classList.add('advantage-negative');
            }
        }
    }

    get nombresPiezas() {
        return {
            peon: 'Peón',
            caballo: 'Caballo',
            alfil: 'Alfil',
            torre: 'Torre',
            reina: 'Reina',
            rey: 'Rey'
        };
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
    new TableroAjedrez();
});