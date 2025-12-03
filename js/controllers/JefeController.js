import Materia from '../models/Materia.js';
import Docente from '../models/Docente.js';
import Horario from '../models/Horario.js';

class JefeController {
    constructor() {
        this.materias = [];
        this.docentes = [];
        this.horarios = [];
    }

    // Gestión de Materias
    async cargarMaterias() {
        this.materias = await Materia.obtenerTodas();
        return this.materias;
    }

    async agregarMateria(nombre, creditos, semestre) {
        const resultado = await Materia.crear(nombre, creditos, semestre);
        if (resultado.success) {
            await this.cargarMaterias();
        }
        return resultado;
    }

    async editarMateria(id, datos) {
        const resultado = await Materia.actualizar(id, datos);
        if (resultado.success) {
            await this.cargarMaterias();
        }
        return resultado;
    }

    async eliminarMateria(id) {
        const resultado = await Materia.eliminar(id);
        if (resultado.success) {
            await this.cargarMaterias();
        }
        return resultado;
    }

    async obtenerMateriasPorSemestre(semestre) {
        return await Materia.obtenerPorSemestre(semestre);
    }

    // Gestión de Docentes
    async cargarDocentes() {
        this.docentes = await Docente.obtenerTodos();
        return this.docentes;
    }

    async agregarDocente(nombre, horasSemanales, usuarioId = null) {
        const resultado = await Docente.crear(nombre, horasSemanales, usuarioId);
        if (resultado.success) {
            await this.cargarDocentes();
        }
        return resultado;
    }

    async editarDocente(id, datos) {
        const resultado = await Docente.actualizar(id, datos);
        if (resultado.success) {
            await this.cargarDocentes();
        }
        return resultado;
    }

    async eliminarDocente(id) {
        const resultado = await Docente.eliminar(id);
        if (resultado.success) {
            await this.cargarDocentes();
        }
        return resultado;
    }

    // Gestión de Horarios - Sistema Simplificado
    async cargarHorariosPorSemestre(semestre) {
        this.horarios = await Horario.obtenerPorSemestre(semestre);
        return this.horarios;
    }

    /**
     * Agregar un horario para una materia en un día específico
     * Permite asignar sin docente ni aula (opcionales)
     */
    async agregarHorario(semestre, dia, hora, materiaId, docenteId = null, aula = null) {
        // Verificar disponibilidad solo si hay docente o aula especificados
        if (docenteId || aula) {
            const disponibilidad = await Horario.verificarDisponibilidad(
                semestre, dia, hora, docenteId, aula
            );

            if (!disponibilidad.disponible) {
                return { 
                    success: false, 
                    mensaje: disponibilidad.mensaje 
                };
            }
        }

        // Verificar que no exista ya un horario para esta materia en este día/hora
        const horarioExistente = this.horarios.find(h => 
            h.semestre === parseInt(semestre) &&
            h.dia === dia &&
            h.hora === hora &&
            h.materiaId === materiaId
        );

        if (horarioExistente) {
            return {
                success: false,
                mensaje: 'Esta materia ya está asignada en este día/hora'
            };
        }

        const resultado = await Horario.crear(
            semestre, dia, hora, materiaId, docenteId, aula
        );

        if (resultado.success) {
            await this.cargarHorariosPorSemestre(semestre);
            return { 
                success: true, 
                mensaje: 'Horario asignado correctamente' 
            };
        }

        return resultado;
    }

    async editarHorario(id, datos) {
        const resultado = await Horario.actualizar(id, datos);
        if (resultado.success) {
            // Recargar horarios del semestre correspondiente
            const horario = this.horarios.find(h => h.id === id);
            if (horario) {
                await this.cargarHorariosPorSemestre(horario.semestre);
            }
        }
        return resultado;
    }

    async eliminarHorario(id) {
        const resultado = await Horario.eliminar(id);
        if (resultado.success) {
            // Remover del array local
            this.horarios = this.horarios.filter(h => h.id !== id);
        }
        return resultado;
    }

    // Métodos auxiliares
    obtenerMateriaPorId(materiaId) {
        return this.materias.find(m => m.id === materiaId);
    }

    obtenerDocentePorId(docenteId) {
        return this.docentes.find(d => d.id === docenteId);
    }

    obtenerHorarioPorCelda(semestre, dia, hora) {
        return this.horarios.find(h => 
            h.semestre === parseInt(semestre) && 
            h.dia === dia && 
            h.hora === hora
        );
    }

    /**
     * Verificar si una materia ya tiene horarios asignados
     */
    verificarMateriaAsignada(semestre, materiaId) {
        return this.horarios.some(h => 
            h.semestre === parseInt(semestre) && 
            h.materiaId === materiaId
        );
    }

    /**
     * Obtener todos los horarios de una materia específica
     */
    obtenerHorariosPorMateria(semestre, materiaId) {
        return this.horarios.filter(h => 
            h.semestre === parseInt(semestre) && 
            h.materiaId === materiaId
        );
    }

    /**
     * Verificar si una materia está completamente asignada
     * (tiene horarios para todos los días según sus créditos)
     */
    materiaCompletamenteAsignada(semestre, materiaId) {
        const materia = this.obtenerMateriaPorId(materiaId);
        if (!materia) return false;

        const horariosMateria = this.obtenerHorariosPorMateria(semestre, materiaId);
        const creditos = parseInt(materia.creditos);

        // Debe tener exactamente tantos horarios como créditos
        return horariosMateria.length === creditos;
    }

    /**
     * Obtener estadísticas de asignación para un semestre
     */
    obtenerEstadisticasSemestre(semestre) {
        const materiasSemestre = this.materias.filter(m => 
            m.semestre === parseInt(semestre)
        );

        const totalMaterias = materiasSemestre.length;
        const materiasCompletas = materiasSemestre.filter(m => 
            this.materiaCompletamenteAsignada(semestre, m.id)
        ).length;
        const materiasParciales = materiasSemestre.filter(m => {
            const horarios = this.obtenerHorariosPorMateria(semestre, m.id);
            return horarios.length > 0 && !this.materiaCompletamenteAsignada(semestre, m.id);
        }).length;
        const materiasSinAsignar = totalMaterias - materiasCompletas - materiasParciales;

        return {
            totalMaterias,
            materiasCompletas,
            materiasParciales,
            materiasSinAsignar,
            porcentajeCompletado: totalMaterias > 0 
                ? Math.round((materiasCompletas / totalMaterias) * 100) 
                : 0
        };
    }
}

export default new JefeController();