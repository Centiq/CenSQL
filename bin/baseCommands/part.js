
var ParitionsCommandHandler = function(){
	this.includeInAudit = false
}

ParitionsCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	if(cParts.length < 2){
		callback([1, "Invalid syntax! Try: '\\h' for help.", "message"])
        return;
	}

	var object = cParts[1].match(/\w+|"(?:\\"|[^"])+"/g);

	var schema = null;
	var table = object[0];

	if(object.length > 1){
		schema = object[0];
		table = object[1];
	}

	if(table[0] == '"' && table[table.length - 1] == '"'){
		table = table.substring(1, table.length - 1);
	}

	conn.exec("conn", "SELECT T.PART_ID, T.LOADED, P.RANGE, T.RECORD_COUNT, CAST(T.MEMORY_SIZE_IN_TOTAL / 1024 / 1024 / 1024 AS DECIMAL(10, 2)) AS SIZE_GB, CAST(T.ESTIMATED_MAX_MEMORY_SIZE_IN_TOTAL / 1024 / 1024 / 1024 AS DECIMAL(10, 2)) AS MAX_SIZE_GB \
		FROM M_CS_TABLES AS T \
		JOIN M_CS_PARTITIONS AS P ON (T.SCHEMA_NAME = p.SCHEMA_NAME AND T.TABLE_NAME = P.TABLE_NAME AND T.PART_ID = P.PART_ID) \
		WHERE T.SCHEMA_NAME = " + (!schema ? "CURRENT_SCHEMA" : "?") + " AND T.TABLE_NAME = ? ORDER BY P.PART_ID ASC", (!schema ? [table] : [schema, table]), function(err, data) {
	    callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "default" : "sql-error"]);
	})
}

module.exports = ParitionsCommandHandler;