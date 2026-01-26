// تصدير جميع الخدمات
export { isElectron, getDbClient } from './db-client';
export { CertificateService } from './certificate-service';
export { TemplateService, TemplateFieldService } from './template-service';
export { SettingsService, UserSettingsService } from './settings-service';
export { BackupService } from './backup-service';
export type { BackupData } from './backup-service';
