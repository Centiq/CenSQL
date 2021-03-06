
var UnloadsCommandHandler = function(){
	this.includeInAudit = true;
}

UnloadsCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	conn.exec("conn", "SELECT CONCAT(CONCAT(CONCAT(CONCAT(CONCAT(CONCAT(CONCAT(YEAR(UNLOAD_TIME), '-'), MONTH(UNLOAD_TIME)), '-'), DAYOFMONTH(UNLOAD_TIME)), ' '), HOUR(UNLOAD_TIME)), ':**:**') AS TIME, HOST, COUNT(*) AS \"COLUMNS IN HOUR\"\
        FROM SYS.M_CS_UNLOADS\
        GROUP BY YEAR(UNLOAD_TIME), MONTH(UNLOAD_TIME), DAYOFMONTH(UNLOAD_TIME), HOUR(UNLOAD_TIME), HOST\
        ORDER BY YEAR(UNLOAD_TIME) DESC, MONTH(UNLOAD_TIME) DESC, DAYOFMONTH(UNLOAD_TIME) DESC, HOUR(UNLOAD_TIME) DESC, HOST DESC\
        LIMIT " + parseInt(cParts[1] && !isNaN(cParts[1]) ? cParts[1] : 10), 
    function(err, data) {
	    callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "default" : "sql-error"]);
	})
}

module.exports = UnloadsCommandHandler;