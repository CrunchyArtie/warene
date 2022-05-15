class Job {
    clients = {};
    register = (element, callback) => {
        if(!this.clients[element]) {
            this.clients[element] = [callback];
        } else {
            this.clients.element.push(callback);
        }
    }
    notify = (element, ...args) => {
        const clients = this.clients[element] || [];
        clients.forEach(c => c(element, ...args))
    };
}
export const job = new Job();
