/**
 * مخزن المستخدم الحالي - يمكن الوصول إليه من أي مكان بدون React hooks
 * يُستخدم لربط اسم المستخدم بسجل الأنشطة
 */

let _currentUserName: string = "النظام";

export function setCurrentUserName(name: string) {
  _currentUserName = name;
}

export function getCurrentUserName(): string {
  return _currentUserName;
}
