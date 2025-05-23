const express = require('express')
const { engine } = require('express-handlebars') 
const path = require('path');
const bodyParser = require('body-parser')
const { movimientosCaballo, movimientosAlfil, movimientosTorre, movimientosReina, movimientosRey, movimientosPeon } = require('./chess');

const app = express()
const port = 80
const usuarios = []

// VARIABLES DE ESTADO DEL JUEGO
let turnoActual = 'blanca'; 
let estadoJuego = 'en-curso';
let estadoTablero = null;

// MIDDLEWARE - DEBE IR ANTES QUE LAS RUTAS
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json());
app.use(express.static('public'));

// CONFIGURACIÓN DE HANDLEBARS
app.engine('handlebars', engine({
  extname: '.handlebars',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    baseUrl: () => '',
    increment: value => value + 1,
    eq: (a, b) => a === b,
  }
}));
app.set('view engine', 'handlebars')
app.set('views', './views')

// FUNCIÓN PARA GENERAR TABLERO
const generarTablero = () => {
    const files = [8, 7, 6, 5, 4, 3, 2, 1];
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const piezas = {
        a8: { tipo: 'torre', color: 'negra' },
        b8: { tipo: 'caballo', color: 'negra' },
        c8: { tipo: 'alfil', color: 'negra' },
        d8: { tipo: 'reina', color: 'negra' },
        e8: { tipo: 'rey', color: 'negra' },
        f8: { tipo: 'alfil', color: 'negra' },
        g8: { tipo: 'caballo', color: 'negra' },
        h8: { tipo: 'torre', color: 'negra' },
        a7: { tipo: 'peon', color: 'negra' },
        b7: { tipo: 'peon', color: 'negra' },
        c7: { tipo: 'peon', color: 'negra' },
        d7: { tipo: 'peon', color: 'negra' },
        e7: { tipo: 'peon', color: 'negra' },
        f7: { tipo: 'peon', color: 'negra' },
        g7: { tipo: 'peon', color: 'negra' },
        h7: { tipo: 'peon', color: 'negra' },
        a2: { tipo: 'peon', color: 'blanca' },
        b2: { tipo: 'peon', color: 'blanca' },
        c2: { tipo: 'peon', color: 'blanca' },
        d2: { tipo: 'peon', color: 'blanca' },
        e2: { tipo: 'peon', color: 'blanca' },
        f2: { tipo: 'peon', color: 'blanca' },
        g2: { tipo: 'peon', color: 'blanca' },
        h2: { tipo: 'peon', color: 'blanca' },
        a1: { tipo: 'torre', color: 'blanca' },
        b1: { tipo: 'caballo', color: 'blanca' },
        c1: { tipo: 'alfil', color: 'blanca' },
        d1: { tipo: 'reina', color: 'blanca' },
        e1: { tipo: 'rey', color: 'blanca' },
        f1: { tipo: 'alfil', color: 'blanca' },
        g1: { tipo: 'caballo', color: 'blanca' },
        h1: { tipo: 'torre', color: 'blanca' }
    };

    const tablero = [];
    for (let i = 0; i < 8; i++) {
        const fila = [];
        for (let j = 0; j < 8; j++) {
            const pos = cols[j] + files[i];
            const color = (i + j) % 2 ? 'negro' : 'blanco';
            const pieza = piezas[pos] ? piezas[pos] : null;
            fila.push({ pos, color, pieza });
        }
        tablero.push(fila);
    }
    return tablero;
};

// Inicializar el estado del tablero
estadoTablero = generarTablero();

// ===== RUTAS API =====
app.get('/turno-actual', (req, res) => {
    console.log('Turno actual solicitado:', turnoActual);
    res.json({ turno: turnoActual });
});

app.get('/estado-juego', (req, res) => {
    res.json({
        turnoActual: turnoActual,
        tablero: estadoTablero,
        estadoJuego: estadoJuego
    });
});

app.post('/rendirse', (req, res) => {
    // Debug para ver qué está llegando
    console.log('req.body completo:', req.body);
    console.log('Content-Type:', req.headers['content-type']);
    
    const { jugador } = req.body;
    
    // Validar que jugador no esté vacío
    if (!jugador) {
        return res.status(400).json({
            success: false,
            mensaje: 'El campo jugador es requerido'
        });
    }
    
    try {
        console.log('Solicitud de rendición recibida:', { 
            jugador, 
            estadoActual: estadoJuego, 
            turnoActual 
        });
        
        if (estadoJuego !== 'en-curso') {
            return res.json({
                success: false,
                mensaje: 'La partida ya ha terminado'
            });
        }
        
        if (jugador !== turnoActual) {
            return res.json({
                success: false,
                mensaje: 'Solo puedes rendirte en tu turno'
            });
        }
        
        const ganador = jugador === 'blanca' ? 'negras' : 'blancas';
        estadoJuego = `${ganador}-ganan`;
        
        console.log(`${jugador} se ha rendido. Ganador: ${ganador}`);
        
        res.json({
            success: true,
            mensaje: `${jugador === 'blanca' ? 'Blancas' : 'Negras'} se han rendido`,
            ganador: ganador,
            estadoJuego: estadoJuego
        });
        
    } catch (error) {
        console.error('Error al procesar rendición:', error);
        res.status(500).json({
            success: false,
            mensaje: 'Error interno del servidor'
        });
    }
});

app.post('/validar-movimiento', (req, res) => {
    console.log('Datos recibidos:', req.body);
    
    const { pieza, color, inicial, final } = req.body;

    if (!pieza || !color || !inicial || !final) {
        return res.status(400).json({ 
            valido: false, 
            mensaje: 'Datos incompletos' 
        });
    }

    if (color !== turnoActual) {
        return res.json({ 
            valido: false, 
            mensaje: `No es tu turno. Turno actual: ${turnoActual}` 
        });
    }

    const [colInicial, filaInicial] = [inicial[0], parseInt(inicial[1])];
    const [colFinal, filaFinal] = [final[0], parseInt(final[1])];

    const xInicial = colInicial.charCodeAt(0) - 'a'.charCodeAt(0);
    const yInicial = 8 - filaInicial;
    const xFinal = colFinal.charCodeAt(0) - 'a'.charCodeAt(0);
    const yFinal = 8 - filaFinal;

    console.log('Posiciones convertidas:', {
        inicial: [xInicial, yInicial],
        final: [xFinal, yFinal]
    });

    let movimientosValidos = [];

    try {
        switch (pieza) {
            case 'caballo':
                movimientosValidos = movimientosCaballo(xInicial, yInicial);
                break;
            case 'alfil':
                movimientosValidos = movimientosAlfil(xInicial, yInicial);
                break;
            case 'torre':
                movimientosValidos = movimientosTorre(xInicial, yInicial);
                break;
            case 'reina':
                movimientosValidos = movimientosReina(xInicial, yInicial);
                break;
            case 'rey':
                movimientosValidos = movimientosRey(xInicial, yInicial);
                break;
            case 'peon':
                movimientosValidos = movimientosPeon(xInicial, yInicial, color);
                break;
            default:
                return res.json({ 
                    valido: false, 
                    mensaje: 'Tipo de pieza no válido' 
                });
        }

        console.log('Movimientos válidos:', movimientosValidos);

        const esValido = movimientosValidos.some(([x, y]) => x === xFinal && y === yFinal);

        if (esValido) {
            turnoActual = turnoActual === 'blanca' ? 'negra' : 'blanca';
            console.log('Nuevo turno:', turnoActual);
        }

        res.json({ 
            valido: esValido, 
            mensaje: esValido ? 'Movimiento válido' : 'Movimiento inválido',
            nuevoTurno: turnoActual
        });
    } catch (error) {
        console.error('Error en validación:', error);
        res.status(500).json({ 
            valido: false, 
            mensaje: 'Error interno del servidor' 
        });
    }
});

app.post('/nueva-partida', (req, res) => {
    try {
        turnoActual = 'blanca';
        estadoJuego = 'en-curso';
        estadoTablero = generarTablero();
        
        console.log('Nueva partida iniciada - Turno actual:', turnoActual);
        
        res.json({ 
            success: true, 
            mensaje: 'Nueva partida iniciada',
            turnoActual: turnoActual,
            estadoJuego: estadoJuego
        });
    } catch (error) {
        console.error('Error al iniciar nueva partida:', error);
        res.status(500).json({ 
            success: false, 
            mensaje: 'Error interno del servidor' 
        });
    }
});

app.post('/register', (req, res) => {
    const { username, password } = req.body
    const existe = usuarios.find(u => u.username === username)
    if (existe) {
        return res.send('Usuario ya existe. <a href="/register">Volver</a>')
    }
    usuarios.push({ username, password })
    res.redirect('/login')
})

app.post('/login', (req, res) => {
    const { username, password } = req.body
    const usuario = usuarios.find(u => u.username === username && u.password === password)
    if (!usuario) {
        return res.send('Credenciales inválidas. <a href="/login">Intentar de nuevo</a>')
    }
    res.render('welcome', { username })
})

// ===== RUTAS DE VISTAS =====
app.get('/', (req, res) => {
    res.render('index', {
        titulo: 'Hello World!',
        mensaje: 'Bienvenido a mi app usando Handlebars 😎'
    })
})

app.get('/play', (req, res) => {
    res.render('play')
})

app.get('/chessboard', (req, res) => {
    res.render('chessboard', { filas: generarTablero() });
});

app.get('/login', (req, res) => {
    res.render('login')
})

app.get('/publicgameplay', (req, res) => {
    res.render('publicgameplay')
})

app.get('/creategame', (req, res) => {
    res.render('creategame')
})

app.get('/register', (req, res) => {
    res.render('register')
})

app.get('/profile', (req, res) => {
    res.render('profile')
})

app.get('/rulesandhistory', (req, res) => {
    res.render('rulesandhistory')
})

app.get('/developers', (req, res) => {
    res.render('developers')
})

app.get('/privategame', (req, res) => {
    res.render('privategame')
})

app.get('/publicgamever', (req, res) => {
    res.render('publicgamever')
})

app.get('/edit', (req, res) => {
    res.render('edit')
})

// Debug: Mostrar todas las rutas registradas (versión segura)
console.log('Rutas registradas:');
if (app._router && app._router.stack) {
    app._router.stack.forEach(function(r){
        if (r.route && r.route.path){
            console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
        }
    });
} else {
    console.log('Router no inicializado aún');
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
    
    // Mostrar rutas después de que el servidor esté corriendo
    setTimeout(() => {
        console.log('\nRutas disponibles después del inicio:');
        if (app._router && app._router.stack) {
            app._router.stack.forEach(function(r){
                if (r.route && r.route.path){
                    console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
                }
            });
        }
    }, 100);
})
