export class ApiResponse {
    constructor(ok, data = null, message = '') { this.ok = ok; this.data = data; this.message = message; }
}