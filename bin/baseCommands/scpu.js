
var ServiceCpuCommandHandler = function(){
	this.includeInAudit = false
}

ServiceCpuCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	conn.exec("conn", "SELECT CONCAT(CONCAT(HOST, ' - ') , SERVICE_NAME), TOTAL_CPU AS \"Working\", 100 - TOTAL_CPU AS \"Idle\" FROM SYS.M_SERVICE_STATISTICS WHERE TOTAL_CPU <> -1", function(err, data) {
	    callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "bar-chart" : "json", "CPU Usage"]);
	})
}

module.exports = ServiceCpuCommandHandler;