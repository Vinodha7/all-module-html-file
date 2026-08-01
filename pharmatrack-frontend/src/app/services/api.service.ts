import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService, ApiResponse } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private gatewayUrl = 'http://localhost:8090';

  private getOptions() {
    return { headers: this.auth.getHeaders() };
  }

  // ── IAM MODULE ──
  getUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/fetchUsers`, this.getOptions());
  }

  getUserById(userId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/fetchUserById/${userId}`, this.getOptions());
  }

  createUser(user: any): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/createUser`, user, this.getOptions());
  }

  updateUser(userId: number, user: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/updateUser/${userId}`, user, this.getOptions());
  }

  deactivateUser(userId: number): Observable<ApiResponse<void>> {
    return this.http.put<ApiResponse<void>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/deactivateUser/${userId}`, null, this.getOptions());
  }

  unlockUser(userId: number, status: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/unlockUser/${userId}`, status, this.getOptions());
  }

  updateUserStatus(userId: number, status: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/updateUserStatus/${userId}`, status, this.getOptions());
  }

  getLockedUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/fetchLockedUsers`, this.getOptions());
  }

  getLoggedInUsers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/fetchLoggedInUsers`, this.getOptions());
  }

  getSites(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/sites`, this.getOptions());
  }

  createSite(site: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/sites`, site, this.getOptions());
  }

  getProducts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/products`, this.getOptions());
  }

  createProduct(product: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/products`, product, this.getOptions());
  }

  getRoles(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/fetchRoles`, this.getOptions());
  }

  createRole(role: any): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/createRole`, role, this.getOptions());
  }

  getPermissionsByRole(roleId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/fetchPermissionsByRole/${roleId}`, this.getOptions());
  }

  // ── ELECTRONIC SIGNATURES ──
  signEntity(payload: { entityType: string; entityId: string; entityVersion: string; meaning: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/signatures`, payload, this.getOptions());
  }

  getSignatures(entityType: string, entityId: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/signatures?entityType=${entityType}&entityId=${entityId}`, this.getOptions());
  }

  verifySignatures(entityType: string, entityId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/verifySignatures?entityType=${entityType}&entityId=${entityId}`, this.getOptions());
  }

  getAllSignatures(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.gatewayUrl}/pharmaTrack/identityAccess/signatures/all`, this.getOptions());
  }

  // ── AUDIT MODULE ──
  getAuditEvents(page: number = 0, size: number = 20, filters?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams().set('page', String(page)).set('size', String(size));
    if (filters) {
      Object.keys(filters).forEach(k => {
        if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
          params = params.set(k, String(filters[k]));
        }
      });
    }
    return this.http.get<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/audit/events`, { ...this.getOptions(), params });
  }

  getAuditSummary(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/audit/summary`, this.getOptions());
  }

  getAuditEventById(eventId: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/audit/events/${encodeURIComponent(eventId)}`, this.getOptions());
  }

  verifyAuditLogIntegrity(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.gatewayUrl}/pharmaTrack/audit/verifyIntegrity`, this.getOptions());
  }

  // Server-side export (PDF / Excel). Honours the active list filters. Returns the
  // raw file bytes so the caller can trigger a browser download.
  exportAuditEvents(format: 'pdf' | 'excel', filters?: any): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    if (filters) {
      Object.keys(filters).forEach(k => {
        if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
          params = params.set(k, String(filters[k]));
        }
      });
    }
    return this.http.get(`${this.gatewayUrl}/pharmaTrack/audit/events/export`, {
      headers: this.auth.getHeaders(),
      params,
      responseType: 'blob'
    });
  }

  // ── CLINICAL TRIAL MODULE ──
  createTrial(trial: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/clinicalTrial/createTrial`, trial, this.getOptions());
  }

  getAllTrials(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/clinicalTrial/getAllTrials`, this.getOptions());
  }

  getTrialById(trialId: number): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/clinicalTrial/getTrialById/${trialId}`, this.getOptions());
  }

  updateTrial(trialId: number, trial: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/clinicalTrial/updateTrial/${trialId}`, trial, this.getOptions());
  }

  createTrialSite(trialId: number, site: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/trialSite/createSite/${trialId}`, site, this.getOptions());
  }

  getTrialSites(trialId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/trialSite/getAllSites/${trialId}`, this.getOptions());
  }

  // ── SUBJECT ENROLLMENT MODULE ──
  createSubject(subject: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/createTrials`, subject, this.getOptions());
  }

  getSubjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/fetchTrials`, this.getOptions());
  }

  getSubjectById(subjectId: number): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/fetchTrialById?subjectId=${subjectId}`, this.getOptions());
  }

  updateSubject(subject: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/updateTrials`, subject, this.getOptions());
  }

  createVisit(visit: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/createVisits`, visit, this.getOptions());
  }

  getVisitsBySubjectId(subjectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/fetchVisitsBySubjectId?subjectId=${subjectId}`, this.getOptions());
  }

  createAdverseEvent(ae: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/createEvents`, ae, this.getOptions());
  }

  getAdverseEventsBySubjectId(subjectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/subjectEnrolment/fetchEventsBySubjectId?subjectId=${subjectId}`, this.getOptions());
  }

  // ── BATCH MANUFACTURING MODULE ──
  createBatch(batch: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/create`, batch, this.getOptions());
  }

  getBatches(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/all`, this.getOptions());
  }

  getBatchById(batchId: number): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/get/${batchId}`, this.getOptions());
  }

  updateBatch(batchId: number, batch: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/update/${batchId}`, batch, this.getOptions());
  }

  getRawMaterials(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/raw-materials`, this.getOptions());
  }

  // Confirmed backend path (used by the dashboard).
  getAllRawMaterials(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/retrieveRawMaterials`, this.getOptions());
  }

  getQCTests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/qc-tests`, this.getOptions());
  }

  createRawMaterial(material: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/createRawMaterial`, material, this.getOptions());
  }

  getRawMaterialsByBatchId(batchId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/retrieveRawMaterialByBatchId/${batchId}`, this.getOptions());
  }

  createQCTest(test: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/createQcTest`, test, this.getOptions());
  }

  getQCTestsByBatchId(batchId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/batchManufacturing/retrieveQcTestByBatchId/${batchId}`, this.getOptions());
  }

  // ── SUPPLY CHAIN MODULE ──
  createShipment(shipment: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/createShipment`, shipment, this.getOptions());
  }

  getShipments(): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/fetchAllShipments`, this.getOptions());
  }

  getShipmentById(id: number): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/fetchShipmentById/${id}`, this.getOptions());
  }

  updateShipment(id: number, shipment: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/updateShipment/${id}`, shipment, this.getOptions());
  }

  createInventory(inv: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/createInventory`, inv, this.getOptions());
  }

  getInventory(): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/fetchAllInventory`, this.getOptions());
  }

  updateReceivedQuantity(id: number, qty: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/updateReceivedQuantity/${id}`, qty, this.getOptions());
  }

  updateDispensedQuantity(id: number, qty: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/updateDispensedQuantity/${id}`, qty, this.getOptions());
  }

  recordTemperatureLog(logData: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/recordTemperatureLog`, logData, this.getOptions());
  }

  getColdChainLogs(): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/fetchAllLogs`, this.getOptions());
  }

  getLogsByShipment(shipmentId: number): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/fetchLogsByShipment/${shipmentId}`, this.getOptions());
  }

  getExcursionLogs(): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/supplyColdManagement/fetchExcursionLogs`, this.getOptions());
  }

  // ── DEVIATION & CAPA MODULE ──
  createDeviation(dev: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/createDeviation`, dev, this.getOptions());
  }

  getDeviations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/retrieveDeviations`, this.getOptions());
  }

  getDeviationById(id: string): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/retrieveDeviationById/${id}`, this.getOptions());
  }

  updateDeviation(id: string, dev: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/updateDeviation/${id}`, dev, this.getOptions());
  }

  createCapa(capa: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/createCapa`, capa, this.getOptions());
  }

  getCapas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/retrieveCapas`, this.getOptions());
  }

  getCapaById(id: string): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/retrieveCapaById/${id}`, this.getOptions());
  }

  getCapasByDeviation(deviationId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/retrieveCapasByDeviation/${deviationId}`, this.getOptions());
  }

  updateCapa(id: string, capa: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/deviationCapa/updateCapa/${id}`, capa, this.getOptions());
  }

  // ── REGULATORY AFFAIRS ──
  createDossier(dossier: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/createDossier`, dossier, this.getOptions());
  }

  getDossiers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/fetchDossiers`, this.getOptions());
  }

  getDossierById(dossierId: string): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/fetchDossierById?dossierId=${dossierId}`, this.getOptions());
  }

  updateDossier(dossier: any): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/updateDossier`, dossier, this.getOptions());
  }

  createMilestone(milestone: any): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/createMilestone`, milestone, this.getOptions());
  }

  getMilestonesByDossier(dossierId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/fetchMilestonesByDossier?dossierId=${dossierId}`, this.getOptions());
  }

  getAllMilestones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/regulatoryAffairs/fetchMilestones`, this.getOptions());
  }

  // ── NOTIFICATIONS ──
  getNotifications(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/notifications/fetchNotifications/${userId}`, this.getOptions());
  }

  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<number>(`${this.gatewayUrl}/pharmaTrack/notifications/unreadCount/${userId}`, this.getOptions());
  }

  updateNotificationStatus(notificationId: number, status: string): Observable<any> {
    return this.http.put<any>(`${this.gatewayUrl}/pharmaTrack/notifications/${notificationId}/status`, { status }, this.getOptions());
  }

  // ── GENERIC WORKFLOW SERVICE ──
  transitionWorkflow(prefix: string, body: { entityType: string; entityId: string; targetStatus: string; reason: string }): Observable<any> {
    return this.http.post<any>(`${this.gatewayUrl}/pharmaTrack/${prefix}/workflow/transition`, body, this.getOptions());
  }

  getWorkflowStatus(prefix: string, entityType: string, entityId: string): Observable<any> {
    return this.http.get<any>(`${this.gatewayUrl}/pharmaTrack/${prefix}/workflow/status/${entityType}/${entityId}`, this.getOptions());
  }

  getWorkflowHistory(prefix: string, entityType: string, entityId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.gatewayUrl}/pharmaTrack/${prefix}/workflow/history/${entityType}/${entityId}`, this.getOptions());
  }
}
