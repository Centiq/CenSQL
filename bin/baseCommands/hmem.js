
var HeapMemoryCommandHandler = function(){
	this.includeInAudit = false
}

HeapMemoryCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	conn.exec("conn", "SELECT CONCAT(CONCAT(HOST, ' - ') , SERVICE_NAME), HEAP_MEMORY_USED_SIZE AS \"Used Memory\", HEAP_MEMORY_ALLOCATED_SIZE - HEAP_MEMORY_USED_SIZE AS \"Available Memory\" FROM SYS.M_SERVICE_MEMORY", function(err, data) {
	    callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "bar-chart" : "json", "Heap Memory Usage"]);
	})
}

module.exports = HeapMemoryCommandHandler;