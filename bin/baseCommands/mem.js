
var MemUsageCommandHandler = function(){
	this.includeInAudit = false
}

MemUsageCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	conn.exec("conn", "SELECT YEAR(SNAPSHOT_ID), MONTH(SNAPSHOT_ID), DAYOFMONTH(SNAPSHOT_ID), HOUR(SNAPSHOT_ID), HOST, TO_INTEGER(MAX(USED_PHYSICAL_MEMORY)/1024/1024/1024), MIN(SNAPSHOT_ID)\
        FROM _SYS_STATISTICS.HOST_RESOURCE_UTILIZATION_STATISTICS\
        WHERE SNAPSHOT_ID > ADD_DAYS(CURRENT_UTCTIMESTAMP, -3)\
        GROUP BY YEAR(SNAPSHOT_ID), MONTH(SNAPSHOT_ID), DAYOFMONTH(SNAPSHOT_ID), HOUR(SNAPSHOT_ID), HOST\
        ORDER BY YEAR(SNAPSHOT_ID) DESC, MONTH(SNAPSHOT_ID) DESC, DAYOFMONTH(SNAPSHOT_ID) DESC, HOUR(SNAPSHOT_ID) DESC, HOST DESC", function(err, data) {
        callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "line-graph" : "json", "Memory usage GB over the last 3 days", 3 * 24]);
    })

}

module.exports = MemUsageCommandHandler;