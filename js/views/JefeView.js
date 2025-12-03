import AuthController from '../controllers/AuthController.js';
import JefeController from '../controllers/JefeController.js';

class JefeView {
    constructor() {
        this.init();
    }

    async init() {
        if (!AuthController.verificarRol('jefe')) {
            return;
        }

        const usuario = AuthController.obtenerSesion();
        document.getElementById('userName').textContent = usuario.usuario;

        this.setupEventListeners();
        await this.cargarMaterias();
        await this.cargarDocentes();
    }

    setupEventListeners() {
        document.getElementById('btnLogout').addEventListener('click', () => {
            localStorage.removeItem('usuarioSesion');
            window.location.href = '../index.html';
        });

        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.cambiarTab(e.target.dataset.tab));
        });

        document.getElementById('btnAgregarMateria').addEventListener('click', () => this.abrirModalMateria());
        document.getElementById('closeModalMateria').addEventListener('click', () => this.cerrarModalMateria());
        document.getElementById('formMateria').addEventListener('submit', (e) => this.guardarMateria(e));
        document.getElementById('filtroSemestre').addEventListener('change', () => this.cargarMaterias());

        document.getElementById('btnAgregarDocente').addEventListener('click', () => this.abrirModalDocente());
        document.getElementById('closeModalDocente').addEventListener('click', () => this.cerrarModalDocente());
        document.getElementById('formDocente').addEventListener('submit', (e) => this.guardarDocente(e));

        document.getElementById('btnCargarHorario').addEventListener('click', () => this.cargarHorario());
        document.getElementById('btnCargarAula').addEventListener('click', () => this.cargarHorarioAula());
    }


    cambiarTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    }

    // === MATERIAS ===
    async cargarMaterias() {
        const filtro = document.getElementById('filtroSemestre').value;
        let materias;
        
        if (filtro) {
            materias = await JefeController.obtenerMateriasPorSemestre(filtro);
        } else {
            materias = await JefeController.cargarMaterias();
        }

        this.renderizarMaterias(materias);
    }

    renderizarMaterias(materias) {
        const tbody = document.querySelector('#tablaMaterias tbody');
        tbody.innerHTML = '';

        if (materias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay materias registradas</td></tr>';
            return;
        }

        materias.forEach(materia => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${materia.nombre}</td>
                <td>${materia.creditos}</td>
                <td>Semestre ${materia.semestre}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="jefeView.editarMateria('${materia.id}')">Editar</button>
                    <button class="btn btn-danger btn-sm" onclick="jefeView.eliminarMateria('${materia.id}')">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    abrirModalMateria(materiaId = null) {
        const modal = document.getElementById('modalMateria');
        const form = document.getElementById('formMateria');
        form.reset();

        if (materiaId) {
            document.getElementById('tituloModalMateria').textContent = 'Editar Materia';
            const materia = JefeController.materias.find(m => m.id === materiaId);
            
            document.getElementById('materiaId').value = materia.id;
            document.getElementById('materiaNombre').value = materia.nombre;
            document.getElementById('materiaCreditos').value = materia.creditos;
            document.getElementById('materiaSemestre').value = materia.semestre;
        } else {
            document.getElementById('tituloModalMateria').textContent = 'Agregar Materia';
            document.getElementById('materiaId').value = '';
        }

        modal.classList.add('show');
    }

    cerrarModalMateria() {
        document.getElementById('modalMateria').classList.remove('show');
    }

    async guardarMateria(e) {
        e.preventDefault();
        
        const id = document.getElementById('materiaId').value;
        const nombre = document.getElementById('materiaNombre').value;
        const creditos = document.getElementById('materiaCreditos').value;
        const semestre = document.getElementById('materiaSemestre').value;

        let resultado;
        if (id) {
            resultado = await JefeController.editarMateria(id, { nombre, creditos, semestre });
        } else {
            resultado = await JefeController.agregarMateria(nombre, creditos, semestre);
        }

        if (resultado.success) {
            this.cerrarModalMateria();
            await this.cargarMaterias();
            alert(id ? 'Materia actualizada' : 'Materia agregada correctamente');
        } else {
            alert('Error al guardar materia');
        }
    }

    editarMateria(id) {
        this.abrirModalMateria(id);
    }

    async eliminarMateria(id) {
        if (confirm('¿Está seguro de eliminar esta materia?')) {
            const resultado = await JefeController.eliminarMateria(id);
            if (resultado.success) {
                await this.cargarMaterias();
                alert('Materia eliminada');
            } else {
                alert('Error al eliminar materia');
            }
        }
    }

    // === DOCENTES ===
    async cargarDocentes() {
        const docentes = await JefeController.cargarDocentes();
        this.renderizarDocentes(docentes);
    }

   async renderizarDocentes(docentes) {
    const tbody = document.querySelector('#tablaDocentes tbody');
    tbody.innerHTML = '';

    if (docentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay docentes registrados</td></tr>';
        return;
    }

    // Cargar todas las materias para poder mostrar sus nombres
    await JefeController.cargarMaterias();
    const todasMaterias = JefeController.materias;

    docentes.forEach(docente => {
        const tr = document.createElement('tr');
        
        // Obtener nombres de materias que el docente puede impartir
        const materiasIds = docente.materias || [];
        const nombresMaterias = materiasIds
            .map(id => {
                const materia = todasMaterias.find(m => m.id === id);
                return materia ? materia.nombre : null;
            })
            .filter(nombre => nombre !== null);
        
        // Crear HTML de materias con badges
        let htmlMaterias = '';
        if (nombresMaterias.length > 0) {
            htmlMaterias = nombresMaterias.map(nombre => 
                `<span style="display:inline-block; background:#9c27b0; color:white; padding:4px 8px; border-radius:12px; margin:2px 4px 2px 0; font-size:0.85em; white-space: nowrap;">${nombre}</span>`
            ).join('');
        } else {
            htmlMaterias = '<span style="color:#999; font-style:italic;">Sin materias asignadas</span>';
        }
        
        tr.innerHTML = `
            <td>${docente.nombre}</td>
            <td>${docente.horasSemanales}</td>
            <td>
                <div style="max-width: 500px; white-space: normal; line-height: 2.2; padding: 5px 0;">
                    ${htmlMaterias}
                </div>
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="jefeView.editarDocente('${docente.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" onclick="jefeView.eliminarDocente('${docente.id}')">Eliminar</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

    abrirModalDocente(docenteId = null) {
        const modal = document.getElementById('modalDocente');
        const form = document.getElementById('formDocente');
        form.reset();

        if (docenteId) {
            document.getElementById('tituloModalDocente').textContent = 'Editar Docente';
            const docente = JefeController.docentes.find(d => d.id === docenteId);
            
            document.getElementById('docenteId').value = docente.id;
            document.getElementById('docenteNombre').value = docente.nombre;
            document.getElementById('docenteHoras').value = docente.horasSemanales;
        } else {
            document.getElementById('tituloModalDocente').textContent = 'Agregar Docente';
            document.getElementById('docenteId').value = '';
        }

        modal.classList.add('show');
    }

    cerrarModalDocente() {
        document.getElementById('modalDocente').classList.remove('show');
    }

    async guardarDocente(e) {
        e.preventDefault();
        
        const id = document.getElementById('docenteId').value;
        const nombre = document.getElementById('docenteNombre').value;
        const horas = document.getElementById('docenteHoras').value;

        let resultado;
        if (id) {
            resultado = await JefeController.editarDocente(id, { nombre, horasSemanales: horas });
        } else {
            resultado = await JefeController.agregarDocente(nombre, horas);
        }

        if (resultado.success) {
            this.cerrarModalDocente();
            await this.cargarDocentes();
            alert(id ? 'Docente actualizado' : 'Docente agregado correctamente');
        } else {
            alert('Error al guardar docente');
        }
    }

    editarDocente(id) {
        this.abrirModalDocente(id);
    }

    async eliminarDocente(id) {
        if (confirm('¿Está seguro de eliminar este docente?')) {
            const resultado = await JefeController.eliminarDocente(id);
            if (resultado.success) {
                await this.cargarDocentes();
                alert('Docente eliminado');
            } else {
                alert('Error al eliminar docente');
            }
        }
    }

    // === HORARIOS - SISTEMA MEJORADO POR HORAS ===
    async cargarHorario() {
        const semestre = document.getElementById('semestreHorario').value;
        await JefeController.cargarMaterias();
        await JefeController.cargarDocentes();
        await JefeController.cargarHorariosPorSemestre(semestre);
        
        this.renderizarHorarioPorHoras(semestre);
    }

  renderizarHorarioPorHoras(semestre) {
    const container = document.getElementById('horarioContainer');
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const horas = [
        '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
        '12:00-13:00', '13:00-14:00', '14:00-15:00'
    ];
    
    const materiasSemestre = JefeController.materias.filter(m => 
        m.semestre === parseInt(semestre)
    );

    if (materiasSemestre.length === 0) {
        container.innerHTML = `
            <div class="alert-warning">
                ⚠️ No hay materias registradas para este semestre.
                Por favor, agrega materias primero en la pestaña "Materias".
            </div>
        `;
        return;
    }

    let html = `
        <div class="info-banner">
            <strong>💡 Instrucciones:</strong> Selecciona una materia para cada hora, luego selecciona el docente que la impartirá. 
            Los días se pintarán automáticamente según los créditos de la materia.
        </div>
        
        <table class="horario-limpio">
            <thead>
                <tr>
                    <th style="width: 120px;">Hora</th>
                    <th style="width: 250px;">Materia</th>
                    ${dias.map(dia => `<th>${dia}</th>`).join('')}
                    <th style="width: 200px;">Docente</th>
                     <th style="width: 150px;">Aula</th>
                </tr>
            </thead>
            <tbody>
    `;

    horas.forEach(hora => {
        const materiasAsignadasEnHora = this.obtenerMateriasAsignadasEnHora(semestre, hora);
        const materiasDisponibles = materiasSemestre.filter(m => 
            !materiasAsignadasEnHora.some(ma => ma.id === m.id)
        );

        // Buscar si hay algún horario asignado en esta hora
        const horarioEnHora = JefeController.horarios.find(h => h.hora === hora);
        const materiaAsignada = horarioEnHora ? JefeController.obtenerMateriaPorId(horarioEnHora.materiaId) : null;
        const docenteAsignado = horarioEnHora ? JefeController.obtenerDocentePorId(horarioEnHora.docenteId) : null;

       html += `<tr>`;
        
        html += `<td class="hora-cell"><strong>${hora}</strong></td>`;
        
        html += `<td class="celda-selector-inline">`;
        
        if (materiaAsignada) {
            // Mostrar el nombre de la materia asignada con botón eliminar
    html += `<div style="display: flex; align-items: center; gap: 8px;">
        <div style="flex: 1; padding: 8px; background: #e8f5e9; border-radius: 4px; color: #2e7d32; font-weight: 500;">
            📚 ${materiaAsignada.nombre}
        </div>
        <button class="btn btn-danger btn-sm" 
            onclick="jefeView.eliminarAsignacionCompleta('${hora}', ${semestre})"
            title="Eliminar asignación">
            🗑️
        </button>
    </div>`;
        } else if (materiasDisponibles.length > 0) {
            html += `<select class="selector-materia" 
                id="materia_${hora.replace(/:/g, '-')}" 
                onchange="jefeView.onMateriaSeleccionada('${hora}', this.value, ${semestre})">
                <option value="">➕ Seleccionar materia...</option>
                ${materiasDisponibles.map(m => 
                    `<option value="${m.id}">${m.nombre} (${m.creditos} créd.)</option>`
                ).join('')}
            </select>`;
        } else {
            html += `<div class="sin-materias-inline">✓ Completo</div>`;
        }
        
        html += `</td>`;
        
        dias.forEach((dia) => {
            const horarioEnDia = JefeController.horarios.find(h => 
                h.hora === hora && h.dia === dia
            );
            
            if (horarioEnDia) {
                const materia = JefeController.obtenerMateriaPorId(horarioEnDia.materiaId);
                const creditos = materia ? parseInt(materia.creditos) : 1;
                
                html += `<td class="dia-asignado creditos-${creditos}" 
                            onclick="jefeView.desasignarHorario('${horarioEnDia.id}', ${semestre})"
                            title="${materia ? materia.nombre : ''} - Click para desasignar">
                    ✓
                </td>`;
            } else {
                html += `<td class="dia-vacio-limpio">-</td>`;
            }
        });
        
        html += `<td class="celda-selector-inline">`;
        
        if (docenteAsignado) {
            // Mostrar el nombre del docente asignado
            html += `<div style="padding: 8px; background: #e3f2fd; border-radius: 4px; color: #1565c0; font-weight: 500;">
                👨‍🏫 ${docenteAsignado.nombre}
            </div>`;
        } else {
            html += `<select class="selector-docente" 
                id="docente_${hora.replace(/:/g, '-')}" 
                disabled 
                style="background: #f0f0f0; width: 100%;">
                <option value="">Primero selecciona materia</option>
            </select>`;
        }
        
        html += `</td>`;
        
        html += `<td class="celda-selector-inline">`;
        
        if (horarioEnHora && horarioEnHora.aula) {
            // Mostrar el aula asignada
            html += `<div style="padding: 8px; background: #fff3e0; border-radius: 4px; color: #e65100; font-weight: 500;">
                🏫 ${horarioEnHora.aula}
            </div>`;
        } else {
            html += `<select class="selector-aula" 
                id="aula_${hora.replace(/:/g, '-')}" 
                disabled 
                style="background: #f0f0f0; width: 100%;">
                <option value="">Selecciona docente primero</option>
            </select>`;
        }
        
        html += `</td>`;
        
        html += `</tr>`; 
       
    });

    html += `</tbody></table>`;
    
    container.innerHTML = html;
}  
 
    obtenerMateriasAsignadasEnHora(semestre, hora) {
        const materiasIds = new Set();
        const materias = [];
        
        JefeController.horarios.forEach(h => {
            if (h.hora === hora && !materiasIds.has(h.materiaId)) {
                materiasIds.add(h.materiaId);
                const materia = JefeController.obtenerMateriaPorId(h.materiaId);
                if (materia) {
                    materias.push(materia);
                }
            }
        });
        
        return materias;
    }

    onMateriaSeleccionada(hora, materiaId, semestre) {
        if (!materiaId) {
            const docenteSelect = document.getElementById(`docente_${hora.replace(/:/g, '-')}`);
            docenteSelect.disabled = true;
            docenteSelect.style.background = '#f0f0f0';
            docenteSelect.innerHTML = '<option value="">Primero selecciona materia</option>';
            return;
        }

        const materia = JefeController.obtenerMateriaPorId(materiaId);
        if (!materia) return;

        const docentesDisponibles = JefeController.docentes.filter(docente => {
            const materiasDocente = docente.materias || [];
            return materiasDocente.includes(materiaId);
        });

        console.log('👨‍🏫 Docentes disponibles para', materia.nombre, ':', docentesDisponibles);

        const docenteSelect = document.getElementById(`docente_${hora.replace(/:/g, '-')}`);
        docenteSelect.disabled = false;
        docenteSelect.style.background = 'white';
        
        if (docentesDisponibles.length > 0) {
            docenteSelect.innerHTML = `
                <option value="">👨‍🏫 Seleccionar docente...</option>
                ${docentesDisponibles.map(d => 
                    `<option value="${d.id}">${d.nombre}</option>`
                ).join('')}
            `;
            
           /* docenteSelect.onchange = () => {
                const docenteId = docenteSelect.value;
                if (docenteId) {
                    this.asignarMateriaConDocente(materiaId, docenteId, hora, semestre);
                }
            };*/
            docenteSelect.onchange = () => {
    const docenteId = docenteSelect.value;
    if (docenteId) {
        //this.mostrarSelectorAula(materiaId, docenteId, hora, semestre);
    this.habilitarSelectorAula(materiaId, docenteId, hora, semestre);
    }
};
        } else {
            docenteSelect.innerHTML = '<option value="">⚠️ No hay docentes disponibles</option>';
            alert(`⚠️ No hay docentes capacitados para impartir "${materia.nombre}".\n\nPor favor, asigna esta materia a un docente primero.`);
        }
    }

    async asignarMateriaConDocente(materiaId, docenteId, hora, semestre) {
        const materia = JefeController.obtenerMateriaPorId(materiaId);
        const docente = JefeController.obtenerDocentePorId(docenteId);
        
        if (!materia || !docente) return;

        const creditos = parseInt(materia.creditos);
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const diasAsignar = dias.slice(0, creditos);

        if (!confirm(`¿Asignar "${materia.nombre}" con el profesor(a) ${docente.nombre} en ${hora}?\n\nSe asignarán ${creditos} días: ${diasAsignar.join(', ')}`)) {
            document.getElementById(`materia_${hora.replace(/:/g, '-')}`).value = '';
            document.getElementById(`docente_${hora.replace(/:/g, '-')}`).disabled = true;
            document.getElementById(`docente_${hora.replace(/:/g, '-')}`).style.background = '#f0f0f0';
            document.getElementById(`docente_${hora.replace(/:/g, '-')}`).innerHTML = '<option value="">Primero selecciona materia</option>';
            return;
        }

        let errores = 0;
        for (const dia of diasAsignar) {
            const resultado = await JefeController.agregarHorario(
                semestre, dia, hora, materiaId, docenteId, null
            );
            if (!resultado.success) {
                errores++;
            }
        }

        if (errores === 0) {
            alert(`✅ ${materia.nombre} asignada a ${docente.nombre}\nDías: ${diasAsignar.join(', ')}`);
        } else {
            alert(`⚠️ Hubo ${errores} errores`);
        }

        await this.cargarHorario();
    }
    async asignarDia(materiaId, dia, hora, semestre) {
        const materia = JefeController.obtenerMateriaPorId(materiaId);
        if (!materia) return;

        if (!confirm(`¿Asignar ${materia.nombre} el ${dia} de ${hora}?`)) {
            return;
        }

        const resultado = await JefeController.agregarHorario(
            semestre, dia, hora, materiaId, null, null
        );

        if (resultado.success) {
            await this.cargarHorario();
            alert('✅ Día asignado correctamente');
        } else {
            alert('❌ ' + (resultado.mensaje || 'Error al asignar'));
        }
    }

    async desasignarHorario(horarioId, semestre) {
        if (!confirm('¿Desasignar este día?')) {
            return;
        }

        const resultado = await JefeController.eliminarHorario(horarioId);
        if (resultado.success) {
            await this.cargarHorario();
            alert('✅ Desasignado correctamente');
        } else {
            alert('❌ Error al desasignar');
        }
    }
    async eliminarAsignacionCompleta(hora, semestre) {
        if (!confirm('¿Eliminar esta materia de esta hora?\n\nSe eliminarán todos los días asignados.')) {
            return;
        }

        const horariosAEliminar = JefeController.horarios.filter(h => 
            h.hora === hora && h.semestre === parseInt(semestre)
        );

        for (const horario of horariosAEliminar) {
            await JefeController.eliminarHorario(horario.id);
        }

        alert(`✅ Eliminado (${horariosAEliminar.length} días liberados)`);
        await this.cargarHorario();
    }
    mostrarSelectorAula(materiaId, docenteId, hora, semestre) {
        const aulas = [
            'A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'A-107', 'A-108', 'A-109', 'A-110',
            'B-201', 'B-202', 'B-203', 'B-204', 'B-205',
            'C-301', 'C-302', 'C-303', 'C-304', 'C-305'
        ];

        const aulasDisponibles = aulas.filter(aula => {
            return !JefeController.horarios.some(h => 
                h.aula === aula && h.hora === hora
            );
        });

        if (aulasDisponibles.length === 0) {
            alert('⚠️ No hay aulas disponibles para esta hora');
            return;
        }

        const aulaSeleccionada = prompt(
            `Selecciona un aula para esta asignación:\n\n${aulasDisponibles.join(', ')}\n\nEscribe el nombre del aula:`
        );

        if (aulaSeleccionada && aulas.includes(aulaSeleccionada.toUpperCase())) {
            this.asignarMateriaConDocenteYAula(materiaId, docenteId, hora, semestre, aulaSeleccionada.toUpperCase());
        } else if (aulaSeleccionada) {
            alert('⚠️ Aula no válida. Debe ser una de las 20 aulas disponibles.');
        }
    }

    async asignarMateriaConDocenteYAula(materiaId, docenteId, hora, semestre, aula) {
        const materia = JefeController.obtenerMateriaPorId(materiaId);
        const docente = JefeController.obtenerDocentePorId(docenteId);
        
        if (!materia || !docente) return;

        const creditos = parseInt(materia.creditos);
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const diasAsignar = dias.slice(0, creditos);

        if (!confirm(`¿Asignar "${materia.nombre}" con ${docente.nombre} en ${aula} a las ${hora}?\n\nDías: ${diasAsignar.join(', ')}`)) {
            return;
        }

        let errores = 0;
        for (const dia of diasAsignar) {
            const resultado = await JefeController.agregarHorario(
                semestre, dia, hora, materiaId, docenteId, aula
            );
            if (!resultado.success) {
                errores++;
            }
        }

        if (errores === 0) {
            alert(`✅ Asignado correctamente en ${aula}`);
        } else {
            alert(`⚠️ Hubo ${errores} errores`);
        }

        await this.cargarHorario();
    }

    // === AULAS ===
    async cargarHorarioAula() {
        const aula = document.getElementById('aulaSelect').value;
        await JefeController.cargarMaterias();
        await JefeController.cargarDocentes();
        
        // Cargar todos los horarios de todos los semestres
        this.todosLosHorarios = [];
        for (let sem = 1; sem <= 9; sem++) {
            const horarios = await JefeController.cargarHorariosPorSemestre(sem);
            this.todosLosHorarios = this.todosLosHorarios.concat(horarios);
        }
        
        this.renderizarHorarioAula(aula);
    }

    renderizarHorarioAula(aula) {
        const container = document.getElementById('aulaContainer');
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const horas = [
            '7:00-8:00', '8:00-9:00', '9:00-10:00', '10:00-11:00', '11:00-12:00',
            '12:00-13:00', '13:00-14:00', '14:00-15:00'
        ];

        let html = `
            <div class="info-banner">
                <strong>🏫 Horario del Aula ${aula}</strong> - Verde = Ocupado | Gris = Disponible
            </div>
            
            <table class="horario-limpio">
                <thead>
                    <tr>
                        <th style="width: 120px;">Hora</th>
                        ${dias.map(dia => `<th>${dia}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
        `;

        horas.forEach(hora => {
            html += `<tr><td class="hora-cell"><strong>${hora}</strong></td>`;
            
            dias.forEach(dia => {
                const horario = this.todosLosHorarios.find(h => 
                    h.aula === aula && h.hora === hora && h.dia === dia
                );

                if (horario) {
                    const materia = JefeController.obtenerMateriaPorId(horario.materiaId);
                    const docente = JefeController.obtenerDocentePorId(horario.docenteId);
                    
                    html += `<td class="dia-asignado" style="background: #4caf50; color: white; cursor: pointer;" 
                        title="${materia ? materia.nombre : ''} - ${docente ? docente.nombre : ''} - Semestre ${horario.semestre}">
                        <div style="font-size: 0.85em; font-weight: bold;">📚 ${materia ? materia.nombre : 'N/A'}</div>
                        <div style="font-size: 0.75em;">👨‍🏫 ${docente ? docente.nombre : 'N/A'}</div>
                        <div style="font-size: 0.7em;">Sem. ${horario.semestre}</div>
                    </td>`;
                } else {
                    html += `<td style="background: #f5f5f5; text-align: center; color: #999;">Disponible</td>`;
                }
            });

            html += `</tr>`;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    }

    habilitarSelectorAula(materiaId, docenteId, hora, semestre) {
        const aulas = [
            'A-101', 'A-102', 'A-103', 'A-104', 'A-105', 'A-106', 'A-107', 'A-108', 'A-109', 'A-110',
            'B-201', 'B-202', 'B-203', 'B-204', 'B-205',
            'C-301', 'C-302', 'C-303', 'C-304', 'C-305'
        ];

        // Filtrar aulas disponibles para esta hora
        const aulasDisponibles = aulas.filter(aula => {
            return !JefeController.horarios.some(h => 
                h.aula === aula && h.hora === hora
            );
        });

        const aulaSelect = document.getElementById(`aula_${hora.replace(/:/g, '-')}`);
        aulaSelect.disabled = false;
        aulaSelect.style.background = 'white';
        
        if (aulasDisponibles.length > 0) {
            aulaSelect.innerHTML = `
                <option value="">🏫 Seleccionar aula...</option>
                ${aulasDisponibles.map(aula => 
                    `<option value="${aula}">${aula}</option>`
                ).join('')}
            `;
            
            aulaSelect.onchange = () => {
                const aula = aulaSelect.value;
                if (aula) {
                    this.asignarMateriaConDocenteYAula(materiaId, docenteId, hora, semestre, aula);
                }
            };
        } else {
            aulaSelect.innerHTML = '<option value="">⚠️ No hay aulas disponibles</option>';
            alert('⚠️ Todas las aulas están ocupadas en esta hora.');
        }
    }

    async asignarMateriaConDocenteYAula(materiaId, docenteId, hora, semestre, aula) {
        const materia = JefeController.obtenerMateriaPorId(materiaId);
        const docente = JefeController.obtenerDocentePorId(docenteId);
        
        if (!materia || !docente) return;

        const creditos = parseInt(materia.creditos);
        const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        const diasAsignar = dias.slice(0, creditos);

        if (!confirm(`¿Asignar "${materia.nombre}" con ${docente.nombre} en ${aula} a las ${hora}?\n\nDías: ${diasAsignar.join(', ')}`)) {
            document.getElementById(`materia_${hora.replace(/:/g, '-')}`).value = '';
            document.getElementById(`docente_${hora.replace(/:/g, '-')}`).disabled = true;
            document.getElementById(`aula_${hora.replace(/:/g, '-')}`).disabled = true;
            return;
        }

        let errores = 0;
        for (const dia of diasAsignar) {
            const resultado = await JefeController.agregarHorario(
                semestre, dia, hora, materiaId, docenteId, aula
            );
            if (!resultado.success) {
                errores++;
            }
        }

        if (errores === 0) {
            alert(`✅ ${materia.nombre} asignada en ${aula}\nDías: ${diasAsignar.join(', ')}`);
        } else {
            alert(`⚠️ Hubo ${errores} errores`);
        }

        await this.cargarHorario();
    }
}



const jefeView = new JefeView();
window.jefeView = jefeView;