import { db } from '../config/firebase.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc,
    query,
    where,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

class Horario {
    constructor() {
        this.collectionName = 'horarios';
        this.diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
        this.horas = [
            '7:00-8:00',
            '8:00-9:00',
            '9:00-10:00',
            '10:00-11:00',
            '11:00-12:00',
            '12:00-13:00',
            '13:00-14:00',
            '14:00-15:00',
            '15:00-16:00',
            '16:00-17:00'
        ];
    }

    async crear(semestre, dia, hora, materiaId, docenteId, aula) {
        try {
            const docRef = await addDoc(collection(db, this.collectionName), {
                semestre: parseInt(semestre),
                dia,
                hora,
                materiaId,
                docenteId,
                aula,
                fechaCreacion: new Date().toISOString()
            });
            return { id: docRef.id, success: true };
        } catch (error) {
            console.error('Error al crear horario:', error);
            return { success: false, error };
        }
    }

    async obtenerPorSemestre(semestre) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('semestre', '==', parseInt(semestre))
            );
            const querySnapshot = await getDocs(q);
            const horarios = [];
            querySnapshot.forEach((doc) => {
                horarios.push({ id: doc.id, ...doc.data() });
            });
            return horarios;
        } catch (error) {
            console.error('Error al obtener horarios:', error);
            return [];
        }
    }

    async obtenerPorDocente(docenteId) {
        try {
            const q = query(
                collection(db, this.collectionName),
                where('docenteId', '==', docenteId)
            );
            const querySnapshot = await getDocs(q);
            const horarios = [];
            querySnapshot.forEach((doc) => {
                horarios.push({ id: doc.id, ...doc.data() });
            });
            return horarios;
        } catch (error) {
            console.error('Error al obtener horarios por docente:', error);
            return [];
        }
    }

    async verificarDisponibilidad(semestre, dia, hora, docenteId = null, aula = null) {
        try {
            // Verificar conflicto de aula
            if (aula) {
                const qAula = query(
                    collection(db, this.collectionName),
                    where('semestre', '==', parseInt(semestre)),
                    where('dia', '==', dia),
                    where('hora', '==', hora),
                    where('aula', '==', aula)
                );
                const aulaSnapshot = await getDocs(qAula);
                if (!aulaSnapshot.empty) {
                    return { disponible: false, mensaje: 'Aula ocupada en ese horario' };
                }
            }

            // Verificar conflicto de docente
            if (docenteId) {
                const qDocente = query(
                    collection(db, this.collectionName),
                    where('dia', '==', dia),
                    where('hora', '==', hora),
                    where('docenteId', '==', docenteId)
                );
                const docenteSnapshot = await getDocs(qDocente);
                if (!docenteSnapshot.empty) {
                    return { disponible: false, mensaje: 'Docente ocupado en ese horario' };
                }
            }

            return { disponible: true };
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            return { disponible: false, error };
        }
    }

    async actualizar(id, datos) {
        try {
            const horarioRef = doc(db, this.collectionName, id);
            const updateData = {
                ...datos,
                semestre: datos.semestre ? parseInt(datos.semestre) : undefined
            };
            await updateDoc(horarioRef, updateData);
            return { success: true };
        } catch (error) {
            console.error('Error al actualizar horario:', error);
            return { success: false, error };
        }
    }

    async eliminar(id) {
        try {
            await deleteDoc(doc(db, this.collectionName, id));
            return { success: true };
        } catch (error) {
            console.error('Error al eliminar horario:', error);
            return { success: false, error };
        }
    }

    async obtenerTodos() {
        try {
            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const horarios = [];
            querySnapshot.forEach((doc) => {
                horarios.push({ id: doc.id, ...doc.data() });
            });
            return horarios;
        } catch (error) {
            console.error('Error al obtener todos los horarios:', error);
            return [];
        }
    }
}

export default new Horario();