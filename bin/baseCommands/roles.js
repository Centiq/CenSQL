var RolesCommandHandler = function(){
	this.includeInAudit = false;
}

RolesCommandHandler.prototype.run = function(command, cParts, conn, screen, callback){

	var args = require('optimist')(cParts).argv._;

	var user = (args.length > 1 ? args[1] : conn.getClientConfig("conn").user);

	conn.exec("conn", "SELECT GRANTEE, ROLE_SCHEMA_NAME, ROLE_NAME, GRANTOR, IS_GRANTABLE FROM GRANTED_ROLES WHERE GRANTEE = ? AND GRANTEE_TYPE = 'USER'", [user], function(err, data) {
		callback([err == null ? 0 : 1, err == null ? data : err, err == null ? "default" : "sql-error"]);
	}.bind(this))

}

module.exports = RolesCommandHandler;