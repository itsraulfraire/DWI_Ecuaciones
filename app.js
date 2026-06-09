function insertar(texto) {
    const input = document.getElementById("ecuacion");
    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.value =
        input.value.substring(0, start) +
        texto +
        input.value.substring(end);

    input.focus();
    input.selectionStart = input.selectionEnd = start + texto.length;
    actualizarVista();
}

function actualizarVista() {
    const eq = document.getElementById("ecuacion").value;
    const vistaDiv = document.getElementById("vista-ecuacion");

    if (eq.trim() === "") {
        vistaDiv.innerHTML = "";
        return;
    }

    let vista = eq.replace(/y('{1,})/g, (match, primes) => {
        const orden = primes.length;
        if (orden === 1) return "\\frac{dy}{dx}";
        return `\\frac{d^{${orden}}y}{dx^{${orden}}}`;
    });

    vista = vista.replace(/\^(\d+)/g, "^{$1}");
    vistaDiv.innerHTML = `$$${vista}$$`;
    MathJax.typesetPromise([vistaDiv]);
}

function validarEcuacion(eq) {
    const errores = [];
    if (!/y'{1,}/.test(eq)) errores.push("No contiene derivadas");
    if (!eq.includes("=")) errores.push("No contiene signo =");
    return errores;
}

function analizar() {
    const eq = document.getElementById("ecuacion").value.trim();
    const mensaje = document.getElementById("mensaje");
    const resultados = document.getElementById("resultado");

    mensaje.style.display = "none";
    resultados.style.display = "none";

    if (!eq) {
        mensaje.textContent = "Por favor introduce una ecuación";
        mensaje.style.display = "block";
        return;
    }

    const errores = validarEcuacion(eq);
    if (errores.length) {
        mensaje.innerHTML = `<ul>${errores.map(e => `<li>${e}</li>`).join("")}</ul>`;
        mensaje.style.display = "block";
        return;
    }

    const derivadas = [...eq.matchAll(/y'{1,}/g)];
    let orden = Math.max(...derivadas.map(d => d[0].length - 1));

    document.getElementById("orden").innerText = orden;
    document.getElementById("grado").innerText = "1";
    document.getElementById("linealidad").innerText =
        /y\s*\^|y'\s*\^/.test(eq) ? "No lineal" : "Lineal";
    document.getElementById("tipo").innerText =
        eq.includes("∂") ? "Parcial" : "Ordinaria";

    resultados.style.display = "block";
}


function mostrarTab(tab) {
    document.getElementById("tab-ed").classList.add("d-none");
    document.getElementById("tab-laplace").classList.add("d-none");
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));

    if (tab === "ed") {
        document.getElementById("tab-ed").classList.remove("d-none");
        document.querySelectorAll(".tab")[0].classList.add("active");
    } else {
        document.getElementById("tab-laplace").classList.remove("d-none");
        document.querySelectorAll(".tab")[1].classList.add("active");
    }
}

function actualizarVistaLaplace() {
    const input = document.getElementById("laplaceInput").value;
    const vista = document.getElementById("vista-laplace");

    if (!input.trim()) {
        vista.innerHTML = "";
        return;
    }

    let latex = input
        .replace(/sin/g, "\\sin")
        .replace(/cos/g, "\\cos")
        .replace(/tan/g, "\\tan")
        .replace(/\^(\d+)/g, "^{$1}");

    console.log("LATEX:", latex);

    // 🔥 limpiar antes de renderizar
    MathJax.typesetClear([vista]);

    vista.innerHTML = `$$${latex}$$`;

    MathJax.typesetPromise([vista]);
}

function insertarLaplace(texto) {
    const input = document.getElementById("laplaceInput");
    const start = input.selectionStart;
    const end = input.selectionEnd;

    input.value =
        input.value.substring(0, start) +
        texto +
        input.value.substring(end);

    input.focus();
    input.selectionStart = input.selectionEnd = start + texto.length;
    actualizarVistaLaplace();
}

function resolverTermino(term) {
    if (/sin\(.+\)/.test(term) && !/^sin\((\d*)t\)$/.test(term)) {
        return {
            formula: "$$\\text{Función no soportada completamente}$$",
            resultado: "\\text{No se puede resolver}",
            pasos: [
                {
                    titulo: "Expresión no compatible",
                    texto: "La app actualmente solo soporta funciones tipo sin(at), no expresiones compuestas.",
                    math: `$$${term}$$`
                }
            ]
        };
    }

    term = term.trim();

    const coefRegex = /^(\(?-?\d+(\.\d+)?(\/-?\d+(\.\d+)?)?\)?)\s*(.+)$/;
    const coefMatch = term.match(coefRegex);

    if (coefMatch) {
        let coef = coefMatch[1];
        const funcion = coefMatch[5].trim();

        coef = coef.replace(/[()]/g, "");

        if (funcion !== "" && funcion !== coef) {
            const base = resolverTermino(funcion);

            if (base) {
                return {
                    formula: "$$\\mathcal{L}\\{c\\,f(t)\\}=c\\,\\mathcal{L}\\{f(t)\\}$$",
                    resultado: base.resultado.startsWith("\\frac")
                        ? (() => {
                            const denominador = base.resultado
                                .replace(/^\\frac\{[^}]+\}\{/, "")
                                .replace(/\}$/, "");

                            if (coef.includes("/")) {
                                const [num, den] = coef.split("/");
                                return `\\frac{${num}}{${den}(${denominador})}`;
                            }

                            return `\\frac{${coef}}{(${denominador})}`;
                        })()
                        : `${coef}\\cdot${base.resultado}`,
                    pasos: [
                        {
                            titulo: "Propiedad de linealidad",
                            texto: "La transformada de Laplace es lineal, por lo que una constante puede factorizarse.",
                            math: "$$\\mathcal{L}\\{c\\,f(t)\\}=c\\,\\mathcal{L}\\{f(t)\\}$$"
                        },
                        {
                            titulo: "Identificación del coeficiente",
                            texto: `Se identifica el coeficiente constante.`,
                            math: `$$c=${coef}$$`
                        },
                        {
                            titulo: "Identificación de la función",
                            texto: "La función sobre la que se aplica Laplace es:",
                            math: `$$f(t)=${funcion}$$`
                        },
                        {
                            titulo: "Cálculo de la transformada de la función",
                            texto: "Se calcula la transformada de Laplace de la función base.",
                            math: `$$\\mathcal{L}\\{${funcion}\\}=${base.resultado}$$`
                        },
                        {
                            titulo: "Aplicación de la constante",
                            texto: "Multiplicamos el resultado por el coeficiente constante.",
                            math: `$$\\mathcal{L}\\{${term}\\}=${coef}\\cdot${base.resultado}$$`
                        }
                    ]
                };
            }
        }
    }

    if (/^sin\((\d*)t\)$/.test(term)) {
        const a = term.match(/^sin\((\d*)t\)$/)[1] || 1;

        return {
            formula: "$$\\mathcal{L}\\{\\sin(at)\\}=\\frac{a}{s^2+a^2}$$",
            resultado: `\\frac{${a}}{s^2+${a}^2}`,
            pasos: [
                {
                    titulo: "Definición de Laplace",
                    texto: "Partimos de la definición general de la transformada de Laplace.",
                    math: "$$\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)\\,dt$$"
                },
                {
                    titulo: "Identificación de la función",
                    texto: `La función ingresada es un seno de la forma sin(at), donde a = ${a}.`,
                    math: "$$f(t)=\\sin(at)$$"
                },
                {
                    titulo: "Sustitución en la definición",
                    texto: "Sustituimos la función dentro de la integral de Laplace.",
                    math: "$$\\int_0^\\infty e^{-st}\\sin(at)\\,dt$$"
                },
                {
                    titulo: "Uso de tabla de Laplace",
                    texto: "Esta integral ya está resuelta y se encuentra en la tabla de transformadas de Laplace.",
                    math: "$$\\mathcal{L}\\{\\sin(at)\\}=\\frac{a}{s^2+a^2}$$"
                }
            ]
        };
    }

    if (/^cos\((\d*)t\)$/.test(term)) {
        const a = term.match(/^cos\((\d*)t\)$/)[1] || 1;

        return {
            formula: "$$\\mathcal{L}\\{\\cos(at)\\}=\\frac{s}{s^2+a^2}$$",
            resultado: `\\frac{s}{s^2+${a}^2}`,
            pasos: [
                {
                    titulo: "Definición de Laplace",
                    texto: "Se utiliza la definición general de la transformada de Laplace.",
                    math: "$$\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)\\,dt$$"
                },
                {
                    titulo: "Identificación de la función",
                    texto: `La función es un coseno de la forma cos(at), con a = ${a}.`,
                    math: "$$f(t)=\\cos(at)$$"
                },
                {
                    titulo: "Sustitución en la integral",
                    texto: "Sustituimos la función en la integral de Laplace.",
                    math: "$$\\int_0^\\infty e^{-st}\\cos(at)\\,dt$$"
                },
                {
                    titulo: "Aplicación de tabla",
                    texto: "Usamos la fórmula correspondiente al coseno en la tabla de Laplace.",
                    math: "$$\\mathcal{L}\\{\\cos(at)\\}=\\frac{s}{s^2+a^2}$$"
                }
            ]
        };
    }

    if (/^e\^\((\-?\d+)t\)$/.test(term)) {
        const a = term.match(/^e\^\((\-?\d+)t\)$/)[1];

        return {
            formula: "$$\\mathcal{L}\\{e^{at}\\}=\\frac{1}{s-a}$$",
            resultado: `\\frac{1}{s-${a}}`,
            pasos: [
                {
                    titulo: "Definición de Laplace",
                    texto: "Iniciamos con la definición de la transformada de Laplace.",
                    math: "$$\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)\\,dt$$"
                },
                {
                    titulo: "Identificación de la función",
                    texto: `La función es una exponencial de la forma e^{at}, donde a = ${a}.`,
                    math: "$$f(t)=e^{at}$$"
                },
                {
                    titulo: "Sustitución y simplificación",
                    texto: "Se combinan los exponentes dentro de la integral.",
                    math: "$$e^{-st}e^{at}=e^{-(s-a)t}$$"
                },
                {
                    titulo: "Resolución de la integral",
                    texto: "La integral resultante es inmediata.",
                    math: "$$\\int_0^\\infty e^{-(s-a)t}\\,dt=\\frac{1}{s-a}$$"
                }
            ]
        };
    }

    if (/^t(\^(\d+))?$/.test(term)) {
        const n = parseInt(term.match(/^t(\^(\d+))?$/)[2] || 1);

        return {
            formula: "$$\\mathcal{L}\\{t^n\\}=\\frac{n!}{s^{n+1}}$$",
            resultado: `\\frac{${factorial(n)}}{s^{${n + 1}}}`,
            pasos: [
                {
                    titulo: "Definición de Laplace",
                    texto: "Usamos la definición general de la transformada.",
                    math: "$$\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)\\,dt$$"
                },
                {
                    titulo: "Identificación de la función",
                    texto: `La función es una potencia del tiempo con n = ${n}.`,
                    math: "$$f(t)=t^n$$"
                },
                {
                    titulo: "Integral tipo Gamma",
                    texto: "Esta integral corresponde a un caso especial de la función Gamma.",
                    math: "$$\\int_0^\\infty e^{-st}t^n\\,dt=\\frac{n!}{s^{n+1}}$$"
                }
            ]
        };
    }

    if (/^-?\d+(\.\d+)?$/.test(term)) {
        const c = term;

        return {
            formula: "$$\\mathcal{L}\\{c\\}=\\int_0^\\infty c\\,e^{-st}\\,dt$$",
            resultado: `\\frac{${c}}{s}`,
            pasos: [
                {
                    titulo: "Definición de la transformada de Laplace",
                    texto: "Usamos la definición general de la transformada de Laplace para cualquier función f(t).",
                    math: "$$\\mathcal{L}\\{f(t)\\}=\\int_0^\\infty e^{-st}f(t)\\,dt$$"
                },
                {
                    titulo: "Identificación de la función",
                    texto: `La función ingresada es constante, por lo tanto f(t) = ${c}.`,
                    math: `$$f(t)=${c}$$`
                },
                {
                    titulo: "Sustitución en la integral",
                    texto: "Sustituimos la función constante dentro de la definición de Laplace.",
                    math: `$$\\mathcal{L}\\{${c}\\}=\\int_0^\\infty ${c}e^{-st}\\,dt$$`
                },
                {
                    titulo: "Extracción de la constante",
                    texto: "Como la constante no depende de t, se puede factorizar fuera de la integral.",
                    math: `$$${c}\\int_0^\\infty e^{-st}\\,dt$$`
                },
                {
                    titulo: "Cálculo de la integral exponencial",
                    texto: "Integramos la función exponencial respecto a t.",
                    math: "$$\\int e^{-st}dt=-\\frac{1}{s}e^{-st}$$"
                },
                {
                    titulo: "Evaluación en los límites",
                    texto: "Evaluamos la integral definida desde 0 hasta infinito.",
                    math: "$$\\left[-\\frac{1}{s}e^{-st}\\right]_0^\\infty=\\frac{1}{s}$$"
                },
                {
                    titulo: "Resultado final",
                    texto: "Multiplicamos el resultado por la constante inicial.",
                    math: `$$\\mathcal{L}\\{${c}\\}=\\frac{${c}}{s}$$`
                }
            ]
        };
    }

    return null;
}

function resolverLaplace() {
    const input = document.getElementById("laplaceInput").value.trim();
    const salida = document.getElementById("laplaceResultado");

    if (!input) {
        salida.innerHTML = "❌ Ingresa una función.";
        return;
    }

    let contenidoPasos = "";
    let resultados = [];

    if (input.includes("+")) {
        contenidoPasos += `
        <h3>📌 Propiedad utilizada</h3>
        $$\\mathcal{L}\\{f(t)+g(t)\\}=F(s)+G(s)$$
        <hr>
        `;

        const terminos = input.split("+");

        for (let index = 0; index < terminos.length; index++) {
            const termino = terminos[index];
            const r = resolverTermino(termino);

            if (!r) {
                salida.innerHTML = `
                    <h3>❌ Error</h3>
                    <p>El término no es compatible:</p>
                    $$${termino.trim()}$$
                `;
                MathJax.typesetPromise([salida]);
                return;
            }

            contenidoPasos += `<h4>🔹 Término ${index + 1}: ${termino.trim()}</h4>`;
            contenidoPasos += `<b>Fórmula aplicada:</b><br>${r.formula}<hr>`;

            r.pasos.forEach((p, i) => {
                contenidoPasos += `
                <b>Paso ${i + 1}: ${p.titulo}</b><br>
                ${p.texto}<br>
                ${p.math}
                <hr>
                `;
            });

            resultados.push(r.resultado);
        }

        salida.innerHTML = `
        ${contenidoPasos}
        <h3>✅ Resultado final</h3>
        $$${resultados.join(" + ")}$$
        `;
    }

    else {
        const r = resolverTermino(input);

        if (!r) {
            salida.innerHTML = "❌ Función no soportada.";
            return;
        }

        contenidoPasos += `
        <h3>📌 Fórmula utilizada</h3>
        ${r.formula}
        <hr>
        <h3>🧮 Desarrollo paso a paso</h3>
        `;

        r.pasos.forEach((p, i) => {
            contenidoPasos += `
            <b>Paso ${i + 1}: ${p.titulo}</b><br>
            ${p.texto}<br>
            ${p.math}
            <hr>
            `;
        });

        contenidoPasos += `
        <h3>✅ Resultado final</h3>
        $$${r.resultado}$$
        `;

        salida.innerHTML = contenidoPasos;
    }

    salida.classList.remove("d-none");
    MathJax.typesetClear([salida]);
    MathJax.typesetPromise([salida]);
}

function factorial(n) {
    let r = 1;
    for (let i = 1; i <= n; i++) r *= i;
    return r;
}