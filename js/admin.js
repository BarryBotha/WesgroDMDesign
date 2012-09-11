function changeListOrder(col, dir, controller, admin){
	
	post_data={format: 'JSON', col: col, dir: dir};
	
	var url=admin+"/"+controller+"/ajax_change_list_order";
	$.post(url, post_data);
	
	var redir = admin+'/'+controller;
	
	location.href = redir;
}