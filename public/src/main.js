// src/main.js
// Punto de entrada principal de la aplicación EduVision

import { Router } from './navigation/router.js';
import { BreadcrumbsManager } from './navigation/breadcrumbs.js';
import { NavigationHistory } from './navigation/history.js';
import { SessionManager } from './auth/session.js';
import { MediaPlayer } from './media/player.js';
import { QuizController } from './quiz/quiz-controller.js';
import { ScreenReader } from './accessibility/screen-reader.js';
import { AccessibilityPreferences } from './accessibility/preferences.js';
import { KeyboardNavigation } from './accessibility/keyboard-navigation.js';
import { ThemeManager } from './theme/theme-manager.js';
import { ColorBlindnessFilters } from './accessibility/color-blindness.js';
import { CoursesController } from './courses/courses-controller.js';
import { TeacherController } from './teacher/teacher-controller.js';
import { getHealth } from './api/api.js';

class App {
  constructor() {
    this.router = null;
    this.breadcrumbs = null;
    this.history = null;
    this.session = null;
    this.mediaPlayer = null;
    this.quiz = null;
    this.screenReader = null;
    this.accessibility = null;
    this.keyboardNav = null;
    this.themeManager = null;
    this.colorBlindness = null;
    this.courses = null;
    this.teacher = null;
  }

  async init() {
    try {
      console.log('🚀 Iniciando EduVision...');
      
      // Comprobar que el servidor esté disponible (endpoint público /health)
      try {
        const health = await getHealth();
        if (health && health.status === 'ok') {
          console.log('✓ Servidor disponible');
        } else {
          console.warn('⚠️ El servidor respondió con un estado inesperado');
        }
      } catch (error) {
        console.warn('⚠️ No se pudo contactar con el servidor. Algunas funciones pueden no estar disponibles.');
      }
      
      // Inicializar módulos principales
      this.session = new SessionManager();
      this.history = new NavigationHistory();
      this.breadcrumbs = new BreadcrumbsManager(this.history);
      this.router = new Router(this.session, this.breadcrumbs, this.history);
      
      // Inicializar módulos de funcionalidad
      this.mediaPlayer = new MediaPlayer();
      this.quiz = new QuizController();
      this.screenReader = new ScreenReader();
      this.themeManager = new ThemeManager();
      this.colorBlindness = new ColorBlindnessFilters();
      this.accessibility = new AccessibilityPreferences();
      this.keyboardNav = new KeyboardNavigation();
      this.courses = new CoursesController();
      this.teacher = new TeacherController();
      
      // Inicializar StudentController si el usuario es alumno
      if (this.session.isLoggedIn() && this.session.user?.rol === 'alumno') {
        const { StudentController } = await import('./student/student-controller.js');
        this.student = new StudentController();
      }
      
      // Inicializar AdminController solo si el usuario es admin
      if (this.session.isLoggedIn() && this.session.user?.rol === 'admin') {
        const { AdminController } = await import('./admin/admin-controller.js');
        this.admin = new AdminController();
      }

      // Configurar eventos globales
      this.setupGlobalEvents();

      // Cargar preferencias guardadas
      this.accessibility.loadPreferences();

      // Mostrar sección inicial o dashboard si hay sesión
      if (this.session.isLoggedIn()) {
        const user = this.session.user;
        let dashboardId = 'dashboardAlumno';
        
        if (user.rol === 'admin') {
          dashboardId = 'dashboardAdmin';
          // Inicializar AdminController si no se hizo antes
          if (!this.admin) {
            const { AdminController } = await import('./admin/admin-controller.js');
            this.admin = new AdminController();
          }
        } else if (user.rol === 'docente') {
          dashboardId = 'dashboardDocente';
        } else if (user.rol === 'alumno') {
          dashboardId = 'dashboardAlumno';
        }
        
        this.router.navigateTo(dashboardId);
        this.session.updateDashboardName();
      } else {
        this.router.navigateTo('inicio');
      }

      console.log('✅ EduVision inicializada correctamente');
      this.logSystemInfo();
    } catch (error) {
      console.error('❌ Error al inicializar la aplicación:', error);
      this.showCriticalError(error);
    }
  }

  setupGlobalEvents() {
    // Manejar enlaces de navegación
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (link && link.id !== 'btnLoginLogout') {
        e.preventDefault();
        const sectionId = link.getAttribute('href').substring(1);
        this.router.navigateTo(sectionId);
      }
    });

    // Atajos de teclado globales
    document.addEventListener('keydown', (e) => {
      // Escape para cerrar modales
      if (e.key === 'Escape') {
        this.closeAllModals();
      }
    });

    // Manejar errores globales
    window.addEventListener('error', (e) => {
      console.error('Error no capturado:', e.error);
    });

    window.addEventListener('unhandledrejection', (e) => {
      console.error('Promesa rechazada no manejada:', e.reason);
    });
  }

  closeAllModals() {
    const modals = document.querySelectorAll('[role="dialog"]:not(.hidden), .modal:not(.hidden)');
    modals.forEach(modal => {
      modal.classList.add('hidden');
    });
  }

  showCriticalError(error) {
    const errorHtml = `
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #1a1d29; color: white; display: flex; align-items: center; justify-center; z-index: 9999; padding: 20px;">
        <div style="max-width: 600px; text-align: center;">
          <h1 style="font-size: 2rem; margin-bottom: 1rem; color: #ef4444;">Error de Inicialización</h1>
          <p style="margin-bottom: 1rem;">Lo sentimos, hubo un error al iniciar la aplicación.</p>
          <pre style="background: #0f172a; padding: 1rem; border-radius: 0.5rem; text-align: left; overflow: auto; font-size: 0.875rem;">${error.message}</pre>
          <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: #0d59f2; border: none; border-radius: 0.5rem; color: white; cursor: pointer; font-size: 1rem;">
            Recargar Página
          </button>
        </div>
      </div>
    `;
    document.body.innerHTML = errorHtml;
  }

  logSystemInfo() {
    console.log('📊 Información del Sistema:');
    console.log('  - Módulos cargados:', Object.keys(this).filter(k => this[k] !== null).length);
    console.log('  - Usuario logueado:', this.session.isLoggedIn() ? 'Sí' : 'No');
    if (this.session.isLoggedIn()) {
      console.log('  - Tipo de usuario:', this.session.getUserType());
    }
    console.log('  - Lector de pantalla:', this.screenReader.active ? 'Activo' : 'Inactivo');
  }

  // Método para reload dinámico de cursos
  async reloadCourses() {
    if (this.courses) {
      await this.courses.loadCursos();
    }
  }

  // Método para cargar quiz de un curso
  async loadQuiz(cursoId) {
    if (this.quiz) {
      const loaded = await this.quiz.loadQuiz(cursoId);
      return loaded;
    }
    return false;
  }
}

// Inicializar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    window.app.init();
  });
} else {
  window.app = new App();
  window.app.init();
}

// Exportar para uso global
export default App;