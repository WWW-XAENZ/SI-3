<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Turnos Profesional</title>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        :root {
            --primary: #2563eb;
            --primary-dark: #1d4ed8;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --info: #3b82f6;
            --gray-50: #f9fafb;
            --gray-100: #f3f4f6;
            --gray-200: #e5e7eb;
            --gray-300: #d1d5db;
            --gray-400: #9ca3af;
            --gray-500: #6b7280;
            --gray-600: #4b5563;
            --gray-700: #374151;
            --gray-800: #1f2937;
            --gray-900: #111827;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: var(--gray-800);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        /* Header */
        .header {
            background: white;
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-lg);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .logo-section {
            display: flex;
            align-items: center;
            gap: 16px;
            cursor: pointer;
            user-select: none;
        }

        .logo-icon {
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }

        .logo-text h1 {
            font-size: 24px;
            font-weight: 700;
            color: var(--gray-900);
        }

        .logo-text p {
            font-size: 14px;
            color: var(--gray-500);
        }

        .connection-status {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
        }

        .connection-status.connected {
            background: #d1fae5;
            color: #065f46;
        }

        .connection-status.disconnected {
            background: #fee2e2;
            color: #991b1b;
        }

        /* Grid Layout */
        .dashboard-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 24px;
        }

        @media (max-width: 968px) {
            .dashboard-grid {
                grid-template-columns: 1fr;
            }
        }

        /* Cards */
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: var(--shadow-lg);
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .card:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-xl);
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid var(--gray-100);
        }

        .card-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .card-icon.primary { background: #dbeafe; color: var(--primary); }
        .card-icon.success { background: #d1fae5; color: var(--success); }
        .card-icon.warning { background: #fef3c7; color: var(--warning); }
        .card-icon.info { background: #dbeafe; color: var(--info); }

        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--gray-900);
        }

        /* Current Turn Display */
        .current-turn-display {
            background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
            color: white;
            padding: 40px;
            border-radius: 16px;
            text-align: center;
            margin-bottom: 20px;
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
        }

        .current-turn-display::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            opacity: 0.3;
        }

        .current-turn-label {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.9;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .current-turn-number {
            font-size: 72px;
            font-weight: 800;
            line-height: 1;
            margin: 16px 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }

        .current-turn-info {
            font-size: 18px;
            opacity: 0.95;
            font-weight: 500;
        }

        .current-turn-plate {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 8px;
            margin-top: 12px;
            font-family: monospace;
            font-size: 20px;
            letter-spacing: 2px;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 24px;
        }

        @media (max-width: 640px) {
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }

        .stat-item {
            background: var(--gray-50);
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid var(--gray-100);
            transition: all 0.2s;
        }

        .stat-item:hover {
            border-color: var(--primary);
            transform: translateY(-2px);
        }

        .stat-value {
            font-size: 32px;
            font-weight: 700;
            color: var(--primary);
            line-height: 1;
            margin-bottom: 4px;
        }

        .stat-label {
            font-size: 13px;
            color: var(--gray-500);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 600;
        }

        /* Turn List */
        .turn-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .turn-list-header {
            display: grid;
            grid-template-columns: 80px 1fr 100px;
            gap: 12px;
            padding: 12px 16px;
            background: var(--gray-100);
            border-radius: 8px;
            font-size: 12px;
            font-weight: 600;
            color: var(--gray-600);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .turn-item {
            display: grid;
            grid-template-columns: 80px 1fr 100px;
            gap: 12px;
            padding: 16px;
            background: var(--gray-50);
            border-radius: 10px;
            margin-bottom: 8px;
            border: 2px solid transparent;
            transition: all 0.2s;
            align-items: center;
        }

        .turn-item:hover {
            border-color: var(--primary);
            background: white;
            transform: translateX(4px);
        }

        .turn-item.current {
            background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
            border-color: var(--primary);
        }

        .turn-item.being-called {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-color: var(--warning);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
            50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
        }

        .turn-number {
            font-size: 20px;
            font-weight: 700;
            color: var(--primary);
            font-family: monospace;
        }

        .turn-item.current .turn-number,
        .turn-item.being-called .turn-number {
            color: var(--gray-900);
        }

        .turn-info {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .turn-company {
            font-weight: 600;
            color: var(--gray-900);
            font-size: 15px;
        }

        .turn-details {
            font-size: 13px;
            color: var(--gray-500);
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .turn-time {
            font-size: 13px;
            color: var(--gray-400);
            font-weight: 500;
        }

        .turn-status {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .turn-status.waiting {
            background: #fef3c7;
            color: #92400e;
        }

        .turn-status.called {
            background: #d1fae5;
            color: #065f46;
        }

        /* Form Styles */
        .form-group {
            margin-bottom: 20px;
        }

        .form-label {
            display: block;
            margin-bottom: 8px;
            font-size: 14px;
            font-weight: 600;
            color: var(--gray-700);
        }

        .form-input, .form-select {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid var(--gray-200);
            border-radius: 10px;
            font-size: 15px;
            transition: all 0.2s;
            background: white;
        }

        .form-input:focus, .form-select:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .form-input::placeholder {
            color: var(--gray-400);
        }

        /* Buttons */
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }

        .btn-primary {
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 12px -1px rgba(37, 99, 235, 0.4);
        }

        .btn-success {
            background: linear-gradient(135deg, var(--success) 0%, #059669 100%);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);
        }

        .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 12px -1px rgba(16, 185, 129, 0.4);
        }

        .btn-danger {
            background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%);
            color: white;
            box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.3);
        }

        .btn-secondary {
            background: var(--gray-100);
            color: var(--gray-700);
        }

        .btn-secondary:hover {
            background: var(--gray-200);
        }

        .btn-small {
            padding: 8px 16px;
            font-size: 13px;
        }

        .btn-large {
            padding: 16px 32px;
            font-size: 17px;
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        /* Waiting Mode Section */
        .waiting-mode-section {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: white;
            padding: 32px;
            border-radius: 16px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-xl);
            display: none;
        }

        .waiting-mode-section.active {
            display: block;
            animation: slideDown 0.5s ease;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .waiting-header {
            text-align: center;
            margin-bottom: 24px;
        }

        .waiting-title {
            font-size: 20px;
            font-weight: 600;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 8px;
        }

        .waiting-subtitle {
            color: var(--gray-400);
            font-size: 15px;
        }

        .waiting-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            align-items: center;
        }

        @media (max-width: 640px) {
            .waiting-content {
                grid-template-columns: 1fr;
            }
        }

        .waiting-turn-display {
            text-align: center;
            padding: 32px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            border: 2px solid rgba(255,255,255,0.1);
        }

        .waiting-turn-number {
            font-size: 64px;
            font-weight: 800;
            color: var(--warning);
            line-height: 1;
            margin-bottom: 8px;
            text-shadow: 0 0 20px rgba(245, 158, 11, 0.5);
        }

        .waiting-turn-label {
            font-size: 14px;
            color: var(--gray-400);
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .waiting-stats {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .waiting-stat {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 16px;
            background: rgba(255,255,255,0.05);
            border-radius: 10px;
        }

        .waiting-stat-icon {
            width: 48px;
            height: 48px;
            background: rgba(37, 99, 235, 0.2);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--primary);
        }

        .waiting-stat-content {
            flex: 1;
        }

        .waiting-stat-value {
            font-size: 24px;
            font-weight: 700;
            color: white;
        }

        .waiting-stat-label {
            font-size: 13px;
            color: var(--gray-400);
        }

        .progress-bar {
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 8px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary) 0%, #60a5fa 100%);
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        /* Turn Called Notification */
        .turn-called-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
        }

        .turn-called-overlay.active {
            display: flex;
            animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .turn-called-modal {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 2px solid var(--warning);
            border-radius: 24px;
            padding: 48px;
            text-align: center;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 0 60px rgba(245, 158, 11, 0.3);
            animation: scaleIn 0.5s ease;
        }

        @keyframes scaleIn {
            from {
                transform: scale(0.8);
                opacity: 0;
            }
            to {
                transform: scale(1);
                opacity: 1;
            }
        }

        .turn-called-icon {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, var(--warning) 0%, #d97706 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: ring 1s ease infinite;
        }

        @keyframes ring {
            0%, 100% { transform: rotate(0deg); }
            10%, 30%, 50%, 70%, 90% { transform: rotate(10deg); }
            20%, 40%, 60%, 80% { transform: rotate(-10deg); }
        }

        .turn-called-title {
            font-size: 28px;
            font-weight: 800;
            color: var(--warning);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 2px;
        }

        .turn-called-number {
            font-size: 96px;
            font-weight: 800;
            color: white;
            line-height: 1;
            margin: 24px 0;
            text-shadow: 0 0 30px rgba(255,255,255,0.3);
        }

        .turn-called-company {
            font-size: 20px;
            color: var(--gray-300);
            margin-bottom: 8px;
        }

        .turn-called-message {
            font-size: 16px;
            color: var(--gray-400);
            margin-bottom: 32px;
            line-height: 1.6;
        }

        /* Admin Panel */
        .admin-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        @media (max-width: 968px) {
            .admin-grid {
                grid-template-columns: 1fr;
            }
        }

        .admin-controls {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }

        /* Tables */
        .table-container {
            overflow-x: auto;
            max-height: 400px;
            overflow-y: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: var(--gray-100);
            padding: 12px 16px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: var(--gray-600);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        td {
            padding: 16px;
            border-bottom: 1px solid var(--gray-100);
        }

        tr:hover td {
            background: var(--gray-50);
        }

        /* Modal */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 9999;
            display: none;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(4px);
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: white;
            border-radius: 16px;
            padding: 32px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: var(--shadow-xl);
            animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
            from {
                transform: translateY(20px);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        }

        .modal-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--gray-900);
        }

        .modal-close {
            background: none;
            border: none;
            cursor: pointer;
            color: var(--gray-400);
            padding: 4px;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .modal-close:hover {
            background: var(--gray-100);
            color: var(--gray-600);
        }

        /* Notification */
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 500;
            box-shadow: var(--shadow-xl);
            z-index: 10001;
            display: flex;
            align-items: center;
            gap: 12px;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
        }

        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .notification.success { background: var(--success); }
        .notification.error { background: var(--danger); }
        .notification.info { background: var(--info); }

        /* Empty State */
        .empty-state {
            text-align: center;
            padding: 48px 24px;
            color: var(--gray-400);
        }

        .empty-state-icon {
            margin-bottom: 16px;
            opacity: 0.5;
        }

        .empty-state-text {
            font-size: 15px;
        }

        /* Responsive */
        @media (max-width: 640px) {
            .header {
                flex-direction: column;
                gap: 16px;
                text-align: center;
            }

            .current-turn-number {
                font-size: 48px;
            }

            .turn-called-number {
                font-size: 64px;
            }
        }

        /* Animations */
        .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .animate-bounce {
            animation: bounce 1s infinite;
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
            50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--gray-100);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
            background: var(--gray-300);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--gray-400);
        }

        /* Utility Classes */
        .text-center { text-align: center; }
        .mt-4 { margin-top: 16px; }
        .mb-4 { margin-bottom: 16px; }
        .w-full { width: 100%; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .justify-between { justify-content: space-between; }
        .gap-2 { gap: 8px; }
        .gap-4 { gap: 16px; }
        .hidden { display: none !important; }
    </style>
<base target="_blank">
</head>
<body>
    <!-- Turn Called Notification Overlay -->
    <div id="turnCalledOverlay" class="turn-called-overlay">
        <div class="turn-called-modal">
            <div class="turn-called-icon">
                <i data-lucide="bell-ring" style="width: 40px; height: 40px; color: white;"></i>
            </div>
            <div class="turn-called-title">¡Es tu turno!</div>
            <div class="turn-called-number" id="calledTurnNumber">T001</div>
            <div class="turn-called-company" id="calledTurnCompany">Nombre Empresa</div>
            <div class="turn-called-message">
                Por favor diríjase al punto de atención inmediatamente.<br>
                Su placa: <strong id="calledTurnPlate">ABC123</strong>
            </div>
            <button class="btn btn-success btn-large" onclick="dismissTurnCalled()">
                <i data-lucide="check-circle" style="width: 20px; height: 20px;"></i>
                Entendido
            </button>
        </div>
    </div>

    <!-- Admin Login Modal -->
    <div id="adminLoginModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i data-lucide="shield" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>
                    Acceso Administrador
                </h3>
                <button class="modal-close" onclick="closeModal('adminLoginModal')">
                    <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                </button>
            </div>
            <form id="adminLoginForm" onsubmit="handleAdminLogin(event)">
                <div class="form-group">
                    <label class="form-label">Contraseña</label>
                    <input type="password" id="adminPassword" class="form-input" placeholder="Ingrese contraseña" required>
                </div>
                <button type="submit" class="btn btn-primary w-full">
                    <i data-lucide="log-in" style="width: 18px; height: 18px;"></i>
                    Ingresar
                </button>
            </form>
        </div>
    </div>

    <!-- Edit Provider Modal -->
    <div id="editProviderModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i data-lucide="edit-3" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>
                    Editar Proveedor
                </h3>
                <button class="modal-close" onclick="closeModal('editProviderModal')">
                    <i data-lucide="x" style="width: 20px; height: 20px;"></i>
                </button>
            </div>
            <form id="editProviderForm" onsubmit="handleEditProvider(event)">
                <input type="hidden" id="editProviderId">
                <div class="form-group">
                    <label class="form-label">Nombre de la Empresa *</label>
                    <input type="text" id="editCompanyName" class="form-input" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Placa del Vehículo *</label>
                    <input type="text" id="editPlate" class="form-input" maxlength="6" style="text-transform: uppercase;" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Persona de Contacto</label>
                    <input type="text" id="editContact" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" id="editPhone" class="form-input">
                </div>
                <div class="form-group">
                    <label class="form-label">Tipo de Servicio</label>
                    <select id="editService" class="form-select">
                        <option value="entrega">Entrega de Mercancía</option>
                        <option value="servicio">Servicio Técnico</option>
                        <option value="reunion">Reunión</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>
                <div style="display: flex; gap: 12px;">
                    <button type="button" class="btn btn-secondary w-full" onclick="closeModal('editProviderModal')">
                        <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i>
                        Cancelar
                    </button>
                    <button type="submit" class="btn btn-success w-full">
                        <i data-lucide="save" style="width: 18px; height: 18px;"></i>
                        Guardar
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Confirmation Modal -->
    <div id="confirmationModal" class="modal">
        <div class="modal-content" style="text-align: center;">
            <div style="width: 64px; height: 64px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                <i data-lucide="check" style="width: 32px; height: 32px; color: var(--success);"></i>
            </div>
            <h3 class="modal-title" style="margin-bottom: 8px;">¡Turno Solicitado!</h3>
            <div style="font-size: 48px; font-weight: 800; color: var(--primary); margin: 16px 0;" id="confirmationTurnNumber">T001</div>
            <p style="color: var(--gray-600); margin-bottom: 24px;" id="confirmationDetails">
                Empresa<br>Motivo de visita
            </p>
            <button class="btn btn-primary w-full" onclick="closeModal('confirmationModal')">
                <i data-lucide="thumbs-up" style="width: 18px; height: 18px;"></i>
                Entendido
            </button>
        </div>
    </div>

    <!-- Main Container -->
    <div class="container">
        <!-- Header -->
        <header class="header">
            <div class="logo-section" id="logoClick">
                <div class="logo-icon">
                    <i data-lucide="layout-grid" style="width: 28px; height: 28px;"></i>
                </div>
                <div class="logo-text">
                    <h1>Sistema de Turnos</h1>
                    <p>Gestión profesional de colas</p>
                </div>
            </div>
            <div id="connectionStatus" class="connection-status disconnected">
                <i data-lucide="wifi-off" style="width: 16px; height: 16px;"></i>
                <span>Sin conexión</span>
            </div>
        </header>

        <!-- Waiting Mode Section (User View) -->
        <div id="waitingModeSection" class="waiting-mode-section">
            <div class="waiting-header">
                <div class="waiting-title">
                    <i data-lucide="clock" style="width: 24px; height: 24px; color: var(--warning);"></i>
                    Modo de Espera Activado
                </div>
                <div class="waiting-subtitle">Mantenga esta ventana abierta para recibir notificaciones</div>
            </div>
            <div class="waiting-content">
                <div class="waiting-turn-display">
                    <div class="waiting-turn-number" id="waitingTurnNumber">--</div>
                    <div class="waiting-turn-label">Su número de turno</div>
                </div>
                <div class="waiting-stats">
                    <div class="waiting-stat">
                        <div class="waiting-stat-icon">
                            <i data-lucide="users" style="width: 24px; height: 24px;"></i>
                        </div>
                        <div class="waiting-stat-content">
                            <div class="waiting-stat-value" id="waitingPosition">--</div>
                            <div class="waiting-stat-label">Posición en cola</div>
                        </div>
                    </div>
                    <div class="waiting-stat">
                        <div class="waiting-stat-icon">
                            <i data-lucide="timer" style="width: 24px; height: 24px;"></i>
                        </div>
                        <div class="waiting-stat-content">
                            <div class="waiting-stat-value" id="waitingTime">--</div>
                            <div class="waiting-stat-label">Tiempo estimado</div>
                            <div class="progress-bar">
                                <div class="progress-fill" id="waitingProgress" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-danger" onclick="cancelMyTurn()">
                        <i data-lucide="x-circle" style="width: 18px; height: 18px;"></i>
                        Cancelar Turno
                    </button>
                </div>
            </div>
        </div>

        <!-- User View -->
        <div id="userView">
            <div class="dashboard-grid">
                <!-- Current Turn Card -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon success">
                            <i data-lucide="activity" style="width: 20px; height: 20px;"></i>
                        </div>
                        <h2 class="card-title">Turno en Atención</h2>
                    </div>
                    <div class="current-turn-display" style="padding: 32px;">
                        <div class="current-turn-label">
                            <i data-lucide="radio" style="width: 16px; height: 16px;"></i>
                            En atención ahora
                        </div>
                        <div class="current-turn-number" id="currentTurnDisplay">--</div>
                        <div class="current-turn-info" id="currentTurnInfo">Esperando...</div>
                        <div class="current-turn-plate" id="currentTurnPlate" style="display: none;"></div>
                    </div>
                    <div class="stats-grid" style="grid-template-columns: repeat(2, 1fr); margin-bottom: 0; margin-top: 16px;">
                        <div class="stat-item">
                            <div class="stat-value" id="turnsWaitingCount" style="color: var(--warning);">0</div>
                            <div class="stat-label">En Espera</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="estimatedTime">0</div>
                            <div class="stat-label">Min Estimados</div>
                        </div>
                    </div>
                </div>

                <!-- Request Turn Form -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon primary">
                            <i data-lucide="plus-circle" style="width: 20px; height: 20px;"></i>
                        </div>
                        <h2 class="card-title">Solicitar Turno</h2>
                    </div>
                    <form id="requestTurnForm" onsubmit="handleRequestTurn(event)">
                        <div class="form-group">
                            <label class="form-label">Placa del Vehículo *</label>
                            <input type="text" id="plateInput" class="form-input" maxlength="6" placeholder="ABC123" required style="text-transform: uppercase;">
                            <small style="color: var(--gray-400); font-size: 12px; margin-top: 4px; display: block;">
                                <i data-lucide="info" style="width: 12px; height: 12px; vertical-align: middle;"></i>
                                Ingrese 6 caracteres (letras y números)
                            </small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nombre de la Empresa *</label>
                            <input type="text" id="companyInput" class="form-input" placeholder="Nombre de su empresa" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Persona de Contacto</label>
                            <input type="text" id="contactInput" class="form-input" placeholder="Nombre del contacto">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Teléfono</label>
                            <input type="tel" id="phoneInput" class="form-input" placeholder="Número de contacto">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo de Servicio *</label>
                            <select id="serviceSelect" class="form-select" required onchange="handleServiceChange()">
                                <option value="">Seleccione un servicio...</option>
                                <option value="entrega">Entrega de Mercancía</option>
                                <option value="servicio">Servicio Técnico</option>
                                <option value="reunion">Reunión</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                        <div class="form-group" id="otherReasonGroup" style="display: none;">
                            <label class="form-label">Especifique el motivo *</label>
                            <input type="text" id="otherReasonInput" class="form-input" placeholder="Describa el motivo de su visita">
                        </div>
                        <button type="submit" class="btn btn-primary w-full btn-large" id="submitTurnBtn">
                            <i data-lucide="ticket" style="width: 20px; height: 20px;"></i>
                            Solicitar Turno
                        </button>
                    </form>
                </div>
            </div>

            <!-- Waiting List -->
            <div class="card">
                <div class="card-header">
                    <div class="card-icon info">
                        <i data-lucide="list" style="width: 20px; height: 20px;"></i>
                    </div>
                    <h2 class="card-title">Turnos en Espera</h2>
                </div>
                <div class="turn-list-header">
                    <div>Turno</div>
                    <div>Información</div>
                    <div style="text-align: center;">Estado</div>
                </div>
                <div id="waitingList" class="turn-list">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="inbox" style="width: 48px; height: 48px;"></i>
                        </div>
                        <div class="empty-state-text">No hay turnos en espera</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Admin View -->
        <div id="adminView" style="display: none;">
            <div class="admin-grid">
                <!-- Control Panel -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon primary">
                            <i data-lucide="settings" style="width: 20px; height: 20px;"></i>
                        </div>
                        <h2 class="card-title">Panel de Control</h2>
                    </div>

                    <div class="current-turn-display" style="margin-bottom: 20px;">
                        <div class="current-turn-label">
                            <i data-lucide="radio" style="width: 16px; height: 16px;"></i>
                            Turno Actual
                        </div>
                        <div class="current-turn-number" id="adminCurrentTurn">--</div>
                        <div class="current-turn-info" id="adminCurrentInfo">Ningún turno en atención</div>
                    </div>

                    <div class="admin-controls">
                        <button class="btn btn-success" onclick="callNextTurn()" id="callNextBtn">
                            <i data-lucide="mic" style="width: 18px; height: 18px;"></i>
                            Llamar Siguiente
                        </button>
                        <button class="btn btn-primary" onclick="completeCurrentTurn()" id="completeTurnBtn" disabled>
                            <i data-lucide="check-circle" style="width: 18px; height: 18px;"></i>
                            Completar
                        </button>
                        <button class="btn btn-secondary" onclick="syncData()">
                            <i data-lucide="refresh-cw" style="width: 18px; height: 18px;"></i>
                            Sincronizar
                        </button>
                    </div>

                    <div class="stats-grid" style="margin-bottom: 0;">
                        <div class="stat-item">
                            <div class="stat-value" id="adminStatsWaiting">0</div>
                            <div class="stat-label">En Espera</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="adminStatsTotal">0</div>
                            <div class="stat-label">Total Hoy</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value" id="adminStatsProviders">0</div>
                            <div class="stat-label">Proveedores</div>
                        </div>
                    </div>
                </div>

                <!-- Waiting List Admin -->
                <div class="card">
                    <div class="card-header">
                        <div class="card-icon warning">
                            <i data-lucide="users" style="width: 20px; height: 20px;"></i>
                        </div>
                        <h2 class="card-title">Cola de Espera</h2>
                    </div>
                    <div id="adminWaitingList" class="turn-list">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <i data-lucide="inbox" style="width: 48px; height: 48px;"></i>
                            </div>
                            <div class="empty-state-text">No hay turnos en espera</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Providers Management -->
            <div class="card" style="margin-top: 24px;">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="card-icon info">
                            <i data-lucide="truck" style="width: 20px; height: 20px;"></i>
                        </div>
                        <h2 class="card-title">Gestión de Proveedores</h2>
                    </div>
                    <button class="btn btn-primary btn-small" onclick="openAddProviderModal()">
                        <i data-lucide="plus" style="width: 16px; height: 16px;"></i>
                        Nuevo Proveedor
                    </button>
                </div>
                <div class="table-container">
                    <table id="providersTable">
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>Placa</th>
                                <th>Contacto</th>
                                <th>Teléfono</th>
                                <th>Servicio</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="providersTableBody">
                            <!-- Dynamic content -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- History -->
            <div class="card" style="margin-top: 24px;">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <div class="card-icon success">
                            <i data-lucide="history" style="width: 20px; height: 20px;"></i>
                        </div>
                        <h2 class="card-title">Historial de Turnos</h2>
                    </div>
                    <button class="btn btn-danger btn-small" onclick="clearHistory()">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                        Limpiar
                    </button>
                </div>
                <div id="historyList" class="turn-list">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="clipboard-list" style="width: 48px; height: 48px;"></i>
                        </div>
                        <div class="empty-state-text">No hay historial disponible</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>

        // ============================================
        // CONFIGURACIÓN Y ESTADO
        // ============================================
        const CONFIG = {
            ADMIN_PASSWORD: '12345',
            LOGO_CLICKS_REQUIRED: 5,
            LOGO_CLICK_TIMEOUT: 2000,
            TURN_TIME_ESTIMATE: 5,
            MAX_HISTORIAL: 200,
            NOTIFICATION_DURATION: 30000
        };

        const AppState = {
            turns: [],
            currentTurn: null,
            turnCounter: parseInt(localStorage.getItem('turnCounter')) || 0,
            providers: JSON.parse(localStorage.getItem('providers')) || [],
            history: JSON.parse(localStorage.getItem('history')) || [],
            myTurn: JSON.parse(localStorage.getItem('myTurn')) || null,
            isAdmin: false,
            notificationShown: {}
        };

        let logoClickCount = 0;
        let logoClickTimer = null;
        let updateInterval = null;

        // ============================================
        // UTILIDADES
        // ============================================
        const Utils = {
            generateTurnNumber() {
                AppState.turnCounter++;
                localStorage.setItem('turnCounter', AppState.turnCounter.toString());
                return 'T' + AppState.turnCounter.toString().padStart(3, '0');
            },

            getCurrentTime() {
                return new Date().toLocaleTimeString('es-ES', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                });
            },

            getCurrentDate() {
                return new Date().toISOString().split('T')[0];
            },

            showNotification(message, type = 'info', duration = 4000) {
                const existing = document.querySelector('.notification');
                if (existing) existing.remove();

                const notification = document.createElement('div');
                notification.className = `notification ${type}`;

                const iconMap = {
                    success: 'check-circle',
                    error: 'alert-circle',
                    info: 'info'
                };

                notification.innerHTML = `
                    <i data-lucide="${iconMap[type]}" style="width: 20px; height: 20px;"></i>
                    <span>${message}</span>
                `;

                document.body.appendChild(notification);
                lucide.createIcons();

                setTimeout(() => {
                    notification.style.opacity = '0';
                    notification.style.transform = 'translateX(100%)';
                    notification.style.transition = 'all 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }, duration);
            },

            setLoading(buttonId, isLoading) {
                const btn = document.getElementById(buttonId);
                if (!btn) return;

                btn.disabled = isLoading;
                if (isLoading) {
                    btn.dataset.originalText = btn.innerHTML;
                    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin" style="width: 18px; height: 18px;"></i> Procesando...`;
                    lucide.createIcons();
                } else if (btn.dataset.originalText) {
                    btn.innerHTML = btn.dataset.originalText;
                    lucide.createIcons();
                }
            },

            formatServiceType(type) {
                const types = {
                    'entrega': 'Entrega de Mercancía',
                    'servicio': 'Servicio Técnico',
                    'reunion': 'Reunión',
                    'otro': 'Otro'
                };
                return types[type] || type;
            }
        };

        // ============================================
        // SISTEMA DE SONIDO
        // ============================================
        const SoundManager = {
            audioContext: null,

            init() {
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    this.audioContext = new AudioContext();
                } catch (e) {
                    console.warn('Web Audio API no soportada');
                }
            },

            playCallSound() {
                if (!this.audioContext) {
                    this.playFallbackSound();
                    return;
                }

                const now = this.audioContext.currentTime;

                // Secuencia de beeps profesional
                [0, 0.2, 0.4].forEach((delay, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();

                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(880, now + delay);
                    osc.frequency.exponentialRampToValueAtTime(440, now + delay + 0.1);

                    gain.gain.setValueAtTime(0, now + delay);
                    gain.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

                    osc.start(now + delay);
                    osc.stop(now + delay + 0.5);
                });
            },

            playFallbackSound() {
                // Audio simple como fallback
                const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQkALpPp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQA0m+nqlnAZADSb6eqWcBkANJvp6pZwGQ==');
                audio.volume = 0.5;
                audio.play().catch(() => {});
            }
        };

        // ============================================
        // GESTIÓN DE TURNOS
        // ============================================
        const TurnManager = {
            createTurn(providerData, reason = '') {
                const plate = providerData.plate?.toUpperCase().trim();

                if (!plate || plate.length !== 6) {
                    throw new Error('La placa debe tener exactamente 6 caracteres');
                }

                if (!providerData.companyName?.trim()) {
                    throw new Error('El nombre de la empresa es requerido');
                }

                // Guardar o actualizar proveedor
                this.saveProvider({
                    id: Date.now(),
                    companyName: providerData.companyName.trim(),
                    plate: plate,
                    contact: providerData.contact?.trim() || '',
                    phone: providerData.phone?.trim() || '',
                    service: providerData.service || 'otro'
                });

                const turnNumber = Utils.generateTurnNumber();

                const turn = {
                    id: Date.now().toString(),
                    number: turnNumber,
                    companyName: providerData.companyName.trim(),
                    plate: plate,
                    contact: providerData.contact?.trim() || '',
                    phone: providerData.phone?.trim() || '',
                    service: providerData.service || 'otro',
                    reason: reason || Utils.formatServiceType(providerData.service),
                    requestTime: Utils.getCurrentTime(),
                    requestDate: Utils.getCurrentDate(),
                    status: 'waiting'
                };

                AppState.turns.push(turn);
                this.saveTurns();

                return turn;
            },

            callNextTurn() {
                if (AppState.currentTurn) {
                    Utils.showNotification('Hay un turno en atención. Complételo primero.', 'error');
                    return null;
                }

                if (AppState.turns.length === 0) {
                    Utils.showNotification('No hay turnos en espera', 'error');
                    return null;
                }

                // Ordenar por fecha/hora de solicitud
                AppState.turns.sort((a, b) => a.id - b.id);

                const nextTurn = AppState.turns.shift();
                nextTurn.status = 'serving';
                nextTurn.callTime = Utils.getCurrentTime();

                AppState.currentTurn = nextTurn;

                this.saveTurns();
                this.saveCurrentTurn();

                SoundManager.playCallSound();

                return nextTurn;
            },

            completeCurrentTurn() {
                if (!AppState.currentTurn) {
                    Utils.showNotification('No hay turno en atención', 'error');
                    return false;
                }

                const completedTurn = {
                    ...AppState.currentTurn,
                    completionTime: Utils.getCurrentTime(),
                    completionDate: Utils.getCurrentDate(),
                    finalStatus: 'completed'
                };

                // Agregar al historial
                AppState.history.unshift(completedTurn);
                if (AppState.history.length > CONFIG.MAX_HISTORIAL) {
                    AppState.history = AppState.history.slice(0, CONFIG.MAX_HISTORIAL);
                }
                localStorage.setItem('history', JSON.stringify(AppState.history));

                // Limpiar turno actual
                AppState.currentTurn = null;
                localStorage.removeItem('currentTurn');

                // Verificar si era el turno del usuario
                if (AppState.myTurn && AppState.myTurn.number === completedTurn.number) {
                    AppState.myTurn = null;
                    localStorage.removeItem('myTurn');
                    deactivateWaitingMode();
                }

                return true;
            },

            cancelTurn(turnId) {
                const index = AppState.turns.findIndex(t => t.id === turnId);
                if (index === -1) return false;

                const cancelledTurn = AppState.turns[index];

                // Verificar si es el turno del usuario
                if (AppState.myTurn && AppState.myTurn.id === turnId) {
                    AppState.myTurn = null;
                    localStorage.removeItem('myTurn');
                    deactivateWaitingMode();
                }

                AppState.turns.splice(index, 1);
                this.saveTurns();

                // Agregar al historial como cancelado
                cancelledTurn.status = 'cancelled';
                cancelledTurn.cancellationTime = Utils.getCurrentTime();
                AppState.history.unshift(cancelledTurn);
                localStorage.setItem('history', JSON.stringify(AppState.history));

                return true;
            },

            saveTurns() {
                localStorage.setItem('turns', JSON.stringify(AppState.turns));
            },

            saveCurrentTurn() {
                if (AppState.currentTurn) {
                    localStorage.setItem('currentTurn', JSON.stringify(AppState.currentTurn));
                } else {
                    localStorage.removeItem('currentTurn');
                }
            },

            loadTurns() {
                AppState.turns = JSON.parse(localStorage.getItem('turns')) || [];
                AppState.currentTurn = JSON.parse(localStorage.getItem('currentTurn')) || null;
                AppState.history = JSON.parse(localStorage.getItem('history')) || [];
            },

            resetQueue() {
                AppState.turns = [];
                AppState.currentTurn = null;
                AppState.turnCounter = 0;
                AppState.myTurn = null;

                localStorage.removeItem('turns');
                localStorage.removeItem('currentTurn');
                localStorage.removeItem('myTurn');
                localStorage.setItem('turnCounter', '0');

                deactivateWaitingMode();
            }
        };

        // ============================================
        // GESTIÓN DE PROVEEDORES
        // ============================================
        const ProviderManager = {
            saveProvider(provider) {
                const existingIndex = AppState.providers.findIndex(p => p.plate === provider.plate);

                if (existingIndex >= 0) {
                    // Actualizar existente
                    AppState.providers[existingIndex] = { ...AppState.providers[existingIndex], ...provider };
                } else {
                    // Agregar nuevo
                    AppState.providers.push(provider);
                }

                localStorage.setItem('providers', JSON.stringify(AppState.providers));
            },

            updateProvider(id, data) {
                const index = AppState.providers.findIndex(p => p.id === id);
                if (index === -1) return false;

                AppState.providers[index] = { ...AppState.providers[index], ...data };
                localStorage.setItem('providers', JSON.stringify(AppState.providers));
                return true;
            },

            deleteProvider(id) {
                const index = AppState.providers.findIndex(p => p.id === id);
                if (index === -1) return false;

                AppState.providers.splice(index, 1);
                localStorage.setItem('providers', JSON.stringify(AppState.providers));
                return true;
            },

            getProviderByPlate(plate) {
                return AppState.providers.find(p => p.plate === plate.toUpperCase());
            },

            getAllProviders() {
                return AppState.providers;
            }
        };

        // ============================================
        // MODO DE ESPERA
        // ============================================
        function activateWaitingMode(turn) {
            AppState.myTurn = turn;
            localStorage.setItem('myTurn', JSON.stringify(turn));

            const section = document.getElementById('waitingModeSection');
            section.classList.add('active');

            updateWaitingMode();

            // Iniciar actualización periódica
            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(updateWaitingMode, 3000);
        }

        function deactivateWaitingMode() {
            const section = document.getElementById('waitingModeSection');
            section.classList.remove('active');

            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        }

        function updateWaitingMode() {
            if (!AppState.myTurn) return;

            const turn = AppState.turns.find(t => t.id === AppState.myTurn.id);
            const isBeingServed = AppState.currentTurn && AppState.currentTurn.id === AppState.myTurn.id;

            // Si el turno ya no existe y no está siendo atendido, fue completado
            if (!turn && !isBeingServed) {
                Utils.showNotification('Su turno ha sido completado. ¡Gracias por su visita!', 'success', 6000);
                AppState.myTurn = null;
                localStorage.removeItem('myTurn');
                deactivateWaitingMode();
                renderUserView();
                return;
            }

            // Actualizar display
            document.getElementById('waitingTurnNumber').textContent = AppState.myTurn.number;

            if (isBeingServed) {
                document.getElementById('waitingPosition').textContent = '¡AHORA!';
                document.getElementById('waitingTime').textContent = 'Es su turno';
                document.getElementById('waitingProgress').style.width = '100%';

                // Mostrar notificación prominente si no se ha mostrado
                if (!AppState.notificationShown[AppState.myTurn.number]) {
                    showTurnCalledNotification(AppState.currentTurn);
                    AppState.notificationShown[AppState.myTurn.number] = true;
                }
            } else if (turn) {
                const position = AppState.turns.findIndex(t => t.id === turn.id) + 1;
                const estimatedMinutes = position * CONFIG.TURN_TIME_ESTIMATE;

                document.getElementById('waitingPosition').textContent = position;
                document.getElementById('waitingTime').textContent = estimatedMinutes + ' min';

                const progress = Math.max(0, 100 - (position * 10));
                document.getElementById('waitingProgress').style.width = progress + '%';
            }
        }

        // ============================================
        // NOTIFICACIÓN DE LLAMADO
        // ============================================
        function showTurnCalledNotification(turn) {
            SoundManager.playCallSound();

            document.getElementById('calledTurnNumber').textContent = turn.number;
            document.getElementById('calledTurnCompany').textContent = turn.companyName;
            document.getElementById('calledTurnPlate').textContent = turn.plate;

            const overlay = document.getElementById('turnCalledOverlay');
            overlay.classList.add('active');

            // Auto-cerrar después de 30 segundos
            setTimeout(() => {
                dismissTurnCalled();
            }, CONFIG.NOTIFICATION_DURATION);
        }

        function dismissTurnCalled() {
            const overlay = document.getElementById('turnCalledOverlay');
            overlay.classList.remove('active');
        }

        // ============================================
        // RENDERIZADO
        // ============================================
        function renderUserView() {
            // Turno actual
            const currentTurnDisplay = document.getElementById('currentTurnDisplay');
            const currentTurnInfo = document.getElementById('currentTurnInfo');
            const currentTurnPlate = document.getElementById('currentTurnPlate');

            if (AppState.currentTurn) {
                currentTurnDisplay.textContent = AppState.currentTurn.number;
                currentTurnInfo.textContent = AppState.currentTurn.companyName;
                currentTurnPlate.textContent = 'Placa: ' + AppState.currentTurn.plate;
                currentTurnPlate.style.display = 'inline-block';
            } else {
                currentTurnDisplay.textContent = '--';
                currentTurnInfo.textContent = 'Esperando...';
                currentTurnPlate.style.display = 'none';
            }

            // Estadísticas
            document.getElementById('turnsWaitingCount').textContent = AppState.turns.length;
            document.getElementById('estimatedTime').textContent = AppState.turns.length * CONFIG.TURN_TIME_ESTIMATE;

            // Lista de espera
            const waitingList = document.getElementById('waitingList');

            if (AppState.turns.length === 0) {
                waitingList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="inbox" style="width: 48px; height: 48px;"></i>
                        </div>
                        <div class="empty-state-text">No hay turnos en espera</div>
                    </div>
                `;
            } else {
                waitingList.innerHTML = AppState.turns.map((turn, index) => {
                    const isMyTurn = AppState.myTurn && AppState.myTurn.id === turn.id;
                    return `
                        <div class="turn-item ${isMyTurn ? 'current' : ''}">
                            <div class="turn-number">${turn.number}</div>
                            <div class="turn-info">
                                <div class="turn-company">${turn.companyName}</div>
                                <div class="turn-details">
                                    <span><i data-lucide="truck" style="width: 12px; height: 12px;"></i> ${turn.plate}</span>
                                    <span><i data-lucide="tag" style="width: 12px; height: 12px;"></i> ${turn.reason}</span>
                                </div>
                            </div>
                            <div class="turn-time">${turn.requestTime}</div>
                        </div>
                    `;
                }).join('');
            }

            lucide.createIcons();
        }

        function renderAdminView() {
            // Turno actual
            const adminCurrentTurn = document.getElementById('adminCurrentTurn');
            const adminCurrentInfo = document.getElementById('adminCurrentInfo');
            const callNextBtn = document.getElementById('callNextBtn');
            const completeTurnBtn = document.getElementById('completeTurnBtn');

            if (AppState.currentTurn) {
                adminCurrentTurn.textContent = AppState.currentTurn.number;
                adminCurrentInfo.textContent = `${AppState.currentTurn.companyName} - Placa: ${AppState.currentTurn.plate}`;
                callNextBtn.disabled = true;
                completeTurnBtn.disabled = false;
            } else {
                adminCurrentTurn.textContent = '--';
                adminCurrentInfo.textContent = 'Ningún turno en atención';
                callNextBtn.disabled = false;
                completeTurnBtn.disabled = true;
            }

            // Estadísticas
            document.getElementById('adminStatsWaiting').textContent = AppState.turns.length;
            document.getElementById('adminStatsTotal').textContent = AppState.history.filter(h => h.completionDate === Utils.getCurrentDate()).length;
            document.getElementById('adminStatsProviders').textContent = AppState.providers.length;

            // Lista de espera admin
            const adminWaitingList = document.getElementById('adminWaitingList');

            if (AppState.turns.length === 0) {
                adminWaitingList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="inbox" style="width: 48px; height: 48px;"></i>
                        </div>
                        <div class="empty-state-text">No hay turnos en espera</div>
                    </div>
                `;
            } else {
                adminWaitingList.innerHTML = AppState.turns.map((turn, index) => `
                    <div class="turn-item">
                        <div class="turn-number">${turn.number}</div>
                        <div class="turn-info">
                            <div class="turn-company">${turn.companyName}</div>
                            <div class="turn-details">
                                <span><i data-lucide="truck" style="width: 12px; height: 12px;"></i> ${turn.plate}</span>
                                <span><i data-lucide="user" style="width: 12px; height: 12px;"></i> ${turn.contact || 'N/A'}</span>
                            </div>
                        </div>
                        <button class="btn btn-danger btn-small" onclick="adminCancelTurn('${turn.id}')">
                            <i data-lucide="x" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `).join('');
            }

            // Tabla de proveedores
            renderProvidersTable();

            // Historial
            renderHistory();

            lucide.createIcons();
        }

        function renderProvidersTable() {
            const tbody = document.getElementById('providersTableBody');

            if (AppState.providers.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 32px; color: var(--gray-400);">
                            <i data-lucide="users" style="width: 32px; height: 32px; margin-bottom: 8px;"></i>
                            <div>No hay proveedores registrados</div>
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = AppState.providers.map(provider => `
                    <tr>
                        <td><strong>${provider.companyName}</strong></td>
                        <td><code style="background: var(--gray-100); padding: 4px 8px; border-radius: 4px;">${provider.plate}</code></td>
                        <td>${provider.contact || '-'}</td>
                        <td>${provider.phone || '-'}</td>
                        <td>${Utils.formatServiceType(provider.service)}</td>
                        <td>
                            <button class="btn btn-secondary btn-small" onclick="editProvider(${provider.id})" style="margin-right: 8px;">
                                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button class="btn btn-danger btn-small" onclick="deleteProvider(${provider.id})">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }

        function renderHistory() {
            const historyList = document.getElementById('historyList');
            const todayHistory = AppState.history.filter(h => h.completionDate === Utils.getCurrentDate()).slice(0, 20);

            if (todayHistory.length === 0) {
                historyList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i data-lucide="clipboard-list" style="width: 48px; height: 48px;"></i>
                        </div>
                        <div class="empty-state-text">No hay historial disponible</div>
                    </div>
                `;
            } else {
                historyList.innerHTML = todayHistory.map(item => `
                    <div class="turn-item">
                        <div class="turn-number">${item.number}</div>
                        <div class="turn-info">
                            <div class="turn-company">${item.companyName}</div>
                            <div class="turn-details">
                                <span><i data-lucide="truck" style="width: 12px; height: 12px;"></i> ${item.plate}</span>
                                <span class="turn-status ${item.finalStatus === 'completed' ? 'called' : 'waiting'}">
                                    ${item.finalStatus === 'completed' ? 'Completado' : 'Cancelado'}
                                </span>
                            </div>
                        </div>
                        <div class="turn-time">${item.completionTime}</div>
                    </div>
                `).join('');
            }
        }

        // ============================================
        // MANEJADORES DE EVENTOS
        // ============================================
        function handleServiceChange() {
            const select = document.getElementById('serviceSelect');
            const otherGroup = document.getElementById('otherReasonGroup');
            const otherInput = document.getElementById('otherReasonInput');

            if (select.value === 'otro') {
                otherGroup.style.display = 'block';
                otherInput.setAttribute('required', 'required');
            } else {
                otherGroup.style.display = 'none';
                otherInput.removeAttribute('required');
                otherInput.value = '';
            }
        }

        function handleRequestTurn(event) {
            event.preventDefault();

            const plate = document.getElementById('plateInput').value;
            const company = document.getElementById('companyInput').value;
            const contact = document.getElementById('contactInput').value;
            const phone = document.getElementById('phoneInput').value;
            const service = document.getElementById('serviceSelect').value;
            const otherReason = document.getElementById('otherReasonInput').value;

            if (!plate || plate.length !== 6) {
                Utils.showNotification('La placa debe tener exactamente 6 caracteres', 'error');
                return;
            }

            if (!service) {
                Utils.showNotification('Seleccione un tipo de servicio', 'error');
                return;
            }

            Utils.setLoading('submitTurnBtn', true);

            try {
                const reason = service === 'otro' ? otherReason : Utils.formatServiceType(service);

                const turn = TurnManager.createTurn({
                    plate,
                    companyName: company,
                    contact,
                    phone,
                    service
                }, reason);

                // Mostrar confirmación
                document.getElementById('confirmationTurnNumber').textContent = turn.number;
                document.getElementById('confirmationDetails').innerHTML = `
                    <strong>${turn.companyName}</strong><br>
                    ${turn.reason}
                `;
                openModal('confirmationModal');

                // Activar modo de espera
                activateWaitingMode(turn);

                // Limpiar formulario
                event.target.reset();
                document.getElementById('otherReasonGroup').style.display = 'none';

                Utils.showNotification(`Turno ${turn.number} solicitado exitosamente`, 'success');
                renderUserView();

            } catch (error) {
                Utils.showNotification(error.message, 'error');
            } finally {
                Utils.setLoading('submitTurnBtn', false);
            }
        }

        function cancelMyTurn() {
            if (!AppState.myTurn) return;

            if (confirm(`¿Está seguro de cancelar su turno ${AppState.myTurn.number}?`)) {
                TurnManager.cancelTurn(AppState.myTurn.id);
                Utils.showNotification('Turno cancelado', 'success');
                renderUserView();
            }
        }

        function callNextTurn() {
            const turn = TurnManager.callNextTurn();
            if (turn) {
                Utils.showNotification(`Turno ${turn.number} llamado`, 'success');
                renderAdminView();
            }
        }

        function completeCurrentTurn() {
            if (confirm('¿Completar el turno actual?')) {
                if (TurnManager.completeCurrentTurn()) {
                    Utils.showNotification('Turno completado', 'success');
                    renderAdminView();
                }
            }
        }

        function adminCancelTurn(turnId) {
            if (confirm('¿Cancelar este turno?')) {
                if (TurnManager.cancelTurn(turnId)) {
                    Utils.showNotification('Turno cancelado', 'success');
                    renderAdminView();
                }
            }
        }

        function syncData() {
            TurnManager.loadTurns();
            renderAdminView();
            Utils.showNotification('Datos sincronizados', 'success');
        }

        function clearHistory() {
            if (confirm('¿Limpiar todo el historial?')) {
                AppState.history = [];
                localStorage.removeItem('history');
                renderAdminView();
                Utils.showNotification('Historial limpiado', 'success');
            }
        }

        // ============================================
        // GESTIÓN DE PROVEEDORES (ADMIN)
        // ============================================
        let editingProviderId = null;

        function openAddProviderModal() {
            editingProviderId = null;
            document.getElementById('editProviderForm').reset();
            document.querySelector('#editProviderModal .modal-title').innerHTML = `
                <i data-lucide="plus-circle" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>
                Nuevo Proveedor
            `;
            openModal('editProviderModal');
            lucide.createIcons();
        }

        function editProvider(id) {
            const provider = AppState.providers.find(p => p.id === id);
            if (!provider) return;

            editingProviderId = id;
            document.getElementById('editProviderId').value = id;
            document.getElementById('editCompanyName').value = provider.companyName;
            document.getElementById('editPlate').value = provider.plate;
            document.getElementById('editContact').value = provider.contact || '';
            document.getElementById('editPhone').value = provider.phone || '';
            document.getElementById('editService').value = provider.service || 'otro';

            document.querySelector('#editProviderModal .modal-title').innerHTML = `
                <i data-lucide="edit-3" style="width: 20px; height: 20px; vertical-align: middle; margin-right: 8px;"></i>
                Editar Proveedor
            `;

            openModal('editProviderModal');
            lucide.createIcons();
        }

        function handleEditProvider(event) {
            event.preventDefault();

            const data = {
                companyName: document.getElementById('editCompanyName').value.trim(),
                plate: document.getElementById('editPlate').value.trim().toUpperCase(),
                contact: document.getElementById('editContact').value.trim(),
                phone: document.getElementById('editPhone').value.trim(),
                service: document.getElementById('editService').value
            };

            if (!data.companyName) {
                Utils.showNotification('El nombre de la empresa es requerido', 'error');
                return;
            }

            if (!data.plate || data.plate.length !== 6) {
                Utils.showNotification('La placa debe tener 6 caracteres', 'error');
                return;
            }

            if (editingProviderId) {
                ProviderManager.updateProvider(editingProviderId, data);
                Utils.showNotification('Proveedor actualizado', 'success');
            } else {
                ProviderManager.saveProvider({
                    id: Date.now(),
                    ...data
                });
                Utils.showNotification('Proveedor agregado', 'success');
            }

            closeModal('editProviderModal');
            renderAdminView();
        }

        function deleteProvider(id) {
            if (confirm('¿Eliminar este proveedor?')) {
                if (ProviderManager.deleteProvider(id)) {
                    Utils.showNotification('Proveedor eliminado', 'success');
                    renderAdminView();
                }
            }
        }

        // ============================================
        // ACCESO ADMIN
        // ============================================
        function handleLogoClick() {
            logoClickCount++;

            if (logoClickTimer) clearTimeout(logoClickTimer);
            logoClickTimer = setTimeout(() => {
                logoClickCount = 0;
            }, CONFIG.LOGO_CLICK_TIMEOUT);

            if (logoClickCount >= CONFIG.LOGO_CLICKS_REQUIRED) {
                logoClickCount = 0;
                openModal('adminLoginModal');
            }
        }

        function handleAdminLogin(event) {
            event.preventDefault();

            const password = document.getElementById('adminPassword').value;

            if (password === CONFIG.ADMIN_PASSWORD) {
                AppState.isAdmin = true;
                closeModal('adminLoginModal');
                document.getElementById('userView').style.display = 'none';
                document.getElementById('adminView').style.display = 'block';
                document.getElementById('connectionStatus').innerHTML = `
                    <i data-lucide="shield-check" style="width: 16px; height: 16px;"></i>
                    <span>Modo Admin</span>
                `;
                document.getElementById('connectionStatus').className = 'connection-status connected';

                renderAdminView();
                Utils.showNotification('Acceso de administrador concedido', 'success');
                lucide.createIcons();
            } else {
                Utils.showNotification('Contraseña incorrecta', 'error');
            }
        }

        // ============================================
        // UTILIDADES DE MODAL
        // ============================================
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        function closeAllModals() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
        }

        // ============================================
        // INICIALIZACIÓN
        // ============================================
        document.addEventListener('DOMContentLoaded', () => {
            // Inicializar sonido
            SoundManager.init();

            // Cargar datos
            TurnManager.loadTurns();

            // Configurar logo click
            document.getElementById('logoClick').addEventListener('click', handleLogoClick);

            // Configurar input de placa (mayúsculas)
            document.getElementById('plateInput').addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });

            document.getElementById('editPlate').addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });

            // Cerrar modales al hacer click fuera
            window.onclick = (e) => {
                if (e.target.classList.contains('modal')) {
                    e.target.classList.remove('active');
                }
            };

            // Verificar si hay turno guardado
            if (AppState.myTurn) {
                const turnExists = AppState.turns.find(t => t.id === AppState.myTurn.id);
                const isBeingServed = AppState.currentTurn && AppState.currentTurn.id === AppState.myTurn.id;

                if (turnExists || isBeingServed) {
                    activateWaitingMode(AppState.myTurn);

                    // Si ya está siendo atendido, mostrar notificación
                    if (isBeingServed) {
                        setTimeout(() => {
                            showTurnCalledNotification(AppState.currentTurn);
                        }, 1000);
                    }
                } else {
                    AppState.myTurn = null;
                    localStorage.removeItem('myTurn');
                }
            }

            // Renderizar vista inicial
            renderUserView();

            // Inicializar iconos
            lucide.createIcons();

            // Actualización periódica para sincronización entre pestañas
            setInterval(() => {
                TurnManager.loadTurns();
                if (AppState.isAdmin) {
                    renderAdminView();
                } else {
                    renderUserView();
                    if (AppState.myTurn) {
                        updateWaitingMode();
                    }
                }
            }, 3000);

            console.log('Sistema de Turnos iniciado');
        });

        // Exponer funciones globales necesarias
        window.dismissTurnCalled = dismissTurnCalled;
        window.cancelMyTurn = cancelMyTurn;
        window.callNextTurn = callNextTurn;
        window.completeCurrentTurn = completeCurrentTurn;
        window.adminCancelTurn = adminCancelTurn;
        window.syncData = syncData;
        window.clearHistory = clearHistory;
        window.openAddProviderModal = openAddProviderModal;
        window.editProvider = editProvider;
        window.deleteProvider = deleteProvider;
        window.closeModal = closeModal;
    </script>
</body>
</html>
