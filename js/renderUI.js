/*
The MIT License (MIT)

Copyright (c) 2015 Felipe Manga

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

(function(){
var onPhone = document.location.href.toLowerCase().indexOf("file:") == 0;

var components = {};

window.defineComponent = function(name, base, func, obj, statics)
{
	components[name] = func;
	base = {"Component":Component, "ComponentContainer":ComponentContainer}[base] || components[base] || base;
	prepare( func, base, obj, statics );
};

function prepare(func, base, obj, statics){
	var ret={};
	for( var k in obj )
	{
		if( base && typeof obj[k] == "function" && typeof base.prototype[k] == "function" )
			obj[k].SUPER = base.prototype[k];
		ret[k] = {value:obj[k], enumerable:true};
	}
	if( base )
	{
		func.prototype = Object.create(base.prototype, ret);
		func.prototype.constructor = base;
	}else func.prototype = obj;
	components[func.name] = func;
	UTIL.mergeTo( func, statics );
	return ret;
}

function Component( ui, el, desc )
{
	var THIS = this;
	this.ui = ui;
	this.index = {};
	this.screen = null;
	if( !ui ) return;
	
	if( el )
	{
		this.dom = DOC.create(el, UTIL.merge({"id":ui.$Name, "className":"Component " + ui.$Type}, desc));
		this.dom.controller = this;
		for( var k in this )
		{
			if( typeof this[k] == "function" && k.indexOf("on") == 0 )
			{
				var nk = k.substr(2);
				var func = this[k].bind(null, this);
				if( onPhone )
				{
					nk = {mousedown:"touchstart", mouseup:"touchend", mousemove:"touchmove", click:1}[nk] || nk;
					if( nk == 1 ) continue;
				}
				this.dom.addEventListener( nk, func );
			}
		}
	}

	this.index[ ui.$Name ] = this;
	var defaultGetter = function(name){ return this.__properties[name]; };
	var defaultSetter = function(name, value){ return this.__properties[name] = value; };
	var hasUnknowns = false;

	function prepGetSet(){
		var props = {};
		for( var k in THIS )
		{
			var m = k.match(/^[gs]et\$(.*)/);
			if( !m ) continue;
			props[m[1]] = m;
		}
		for( k in props )
		{
			var g = THIS["get$" + k];
			var s = THIS["set$" + k];
			var v = ui[k] || THIS[k];

			if( typeof g != "function" )
			{
				v = v||g;
				g = null;
			}
			THIS["__default" + k] = v;

			if( !g ) g = defaultGetter.bind(THIS, k);

			if( s === undefined ) s = defaultSetter.bind(THIS, k);
			else if( !s ) s = undefined;

			THIS.addProperty(k, undefined, g, s);
			if( v !== undefined ) 
				THIS[k] = v;
		}
	}

	prepGetSet();

	for( var k in ui )
	{
		var g = this["get$" + k];
		var s = this["set$" + k];
		
		if( s === undefined && g === undefined )
		{
			console.log("Unknown property " + k + " in component " + ui.$Type + ".");
			hasUnknowns = true;
		}
	}

	if( hasUnknowns )
		console.log(ui);

	this.Height = this.Height;
};

function handler(name, com, evt)
{
	// console.log(com.$Name + "_" + name, evt.type);
	if( !{"INPUT":1,"BUTTON":1}[evt.target.tagName] && onPhone ) 
		evt.preventDefault();
	if( !com.Enabled ) return;
	var c = com.screen[com.$Name + "_" + name];
	if( name == "TouchDown" ) com.dom.__doClick = true;
	if( name == "Drag" ) com.dom.__doClick = false;
	if( c ) c();
	if( name == "TouchUp" && com.dom.__doClick ) com.__onclick( com, evt );
	return false;
}

prepare(Component, null, {
    parent: null,
    children: null,
    childIndex: null,
    $resize:function(w, h){
    	if( !this.dom ) return;
    	this.dom.style.width = w + "px";
    	this.dom.style.height = h + "px";
    },
	calcMinSize:function(){
		this.Text = this.Text;
	},
    get$$Name:"",
    get$$Type:0,
    get$$Version:0,
    get$Uuid:0,
    set$HasMargins:function(v){
    	this.__properties.HasMargins = v;
    	if( this.dom )
    		this.dom.style.borderStyle = v?"solid":"none";
    },
    get$Visible:true,
    set$Visible:function(v){
    	if( typeof v == "string" && v.toLowerCase() == "false" ) v=false;
    	if( this.__properties.Visible==v ) return;
    	this.__properties.Visible=v;
    	if( !this.dom ) return;

    	if( v ) this.dom.style.display = "";
    	else this.dom.style.display = "none";
    	if( this.screen ) this.screen.$resize();
    },
    get$Enabled:true,
    set$Enabled:function(v){
    	v=!!v;
    	this.__properties.Enabled = v;
    	if( this.dom && ("disabled" in this.dom) )
    		this.dom.disabled = !v;
    },
    get$Width:function(){
    	return (this.dom && this.dom.clientWidth) || this.__properties.Width;
    },
    set$Width:function(v){
    	this.__properties.Width = v;
    	if( this.screen ) this.screen.$resize();
    },
    get$Height:function(){
    	return (this.dom && this.dom.clientHeight) || this.__properties.Height;
    },
    set$Height:function(v){
    	this.__properties.Height = v;
    	if( this.screen ) this.screen.$resize();
    },
    set$BackgroundColor:function(c){
    	this.__properties.BackgroundColor = c;
    	if( typeof c == "string" )
    		c = c.replace(/^&H[A-F0-9]{2}([A-F0-9]{6})$/, "#$1");
    	else if( c instanceof LIB.Color )
    		c = c.toRGBString();
    	this.dom.style.backgroundColor = c;
    },
	set$Image:function(name){
		if( name == this.__properties.Image ) return;
		this.__properties.Image = name;
		var THIS = this;
		LIB.getFileBinary("assets/" + name, function(data){
			if( THIS.__properties.Image != name ) return;
			var ext = name.match(/\.([a-zA-Z]+)$/) || [0, "png"];
			ext = ext[1];
			var fmt = "url(data:image/"+ext+";base64,"
			THIS.dom.style.backgroundImage = fmt + btoa(data) + ")";
		});
		return name;
	},
	set$Text: function( t ){
		if( t === undefined ) t = "";
		this.dom.textContent = this.__properties.Text = t;
		if( !this.FontSize ) return;

		if( this.ui.Width === undefined )
		{
			var w = this.__defaultWidth;
			if( !w )
			{
				var marginX = (
								 parseInt(DOC.getStyle(this.dom, "padding-left")) + 
								 parseInt(DOC.getStyle(this.dom, "padding-right")) +
								 parseInt(DOC.getStyle(this.dom, "border-left")) +
								 parseInt(DOC.getStyle(this.dom, "border-right"))
								 )||0;
				w = (Math.floor(DOC.getTextWidth(t, (this.FontSize||20)+"px " + (this.dom.style.fontFamily || "sans-serif")))+marginX+1) + "px";
			}
			this.dom.style.minWidth = w;
			this.__properties.Width = w;
		}
		if( this.ui.Height === undefined )
		{
			var lh = parseInt(DOC.getStyle(this.dom, "line-height")) || 0;
			var marginY = (
						 parseInt(DOC.getStyle(this.dom, "padding-top")) + 
						 parseInt(DOC.getStyle(this.dom, "padding-bottom")) +
						 parseInt(DOC.getStyle(this.dom, "border-top")) +
						 parseInt(DOC.getStyle(this.dom, "border-bottom"))
						 ) || 0;
			var h = (this.__defaultHeight || (Math.max(this.FontSize, lh)+marginY+1))+"px";
			this.dom.style.minHeight = h;
			this.__properties.Height = h;
		}
		
		return t;
	},
	set$TextColor:function(b){
		this.__properties.TextColor = b;
		if( b instanceof LIB.Color ) b = b.toRGBString();
		else b = (""+b).replace(/^&H[0-9a-fA-F]{2}([0-9A-Fa-f]+$)/, "#$1");
		if( b ) this.dom.style.color = b;
		else this.dom.style.fontStyle = "";
	},
	set$TextAlignment:function(b){
		this.__properties.TextAlignment = b;
		this.dom.style.textAlign = ["left", "center", "right"][parseInt(b)] || "center";
	},
	set$FontItalic:function(b){
		this.__properties.FontItalic = b;
		if( b ) this.dom.style.fontStyle = "italic";
		else this.dom.style.fontStyle = "";
	},
	set$FontBold:function(b){
		this.__properties.FontBold = b;
		if( b ) this.dom.style.fontWeight = "bold";
		else this.dom.style.fontWeight = "";
	},
	get$FontTypeface:"1",
	set$FontTypeface:function(tf){
		if( !this.dom ) return;
		var face=["sans-serif", "serif", "MONOSPACE"][ parseInt(tf)-1 ] || "Arial";
		this.dom.style.fontFamily = face;
		if( this.Text ) this.Text = this.Text; // force recalc
		this.__properties.FontTypeface = tf;
		return tf;
	},
	get$FontSize: 14,
	set$FontSize: function( s ){
		if( !this.dom ) return;
		s = parseFloat(s) || 14;
		this.dom.style.fontSize = Math.floor(s-s*0.1) + "px";
		return this.__properties.FontSize = s;
	},
	set$Hint:function(h){
		this.__properties.Hint = h;
		if( "alt" in this.dom )
			this.dom.alt = h;
		if( "placeholder" in this.dom )
			this.dom.placeholder = h;
		return h;
	},
	HideKeyboard:function(){
		this.dom.blur();
	},
	RequestFocus:function(){
		this.dom.focus();
	},
    __onclick:handler.bind(null, "Click"),
    ondblclick:handler.bind(null, "LongClick"),
    onfocus:handler.bind(null, "GotFocus"),
    onblur:handler.bind(null, "LostFocus"),
    onmousemove:handler.bind(null, "Drag"),
    onmousedown:handler.bind(null, "TouchDown"),
    onmouseup:handler.bind(null, "TouchUp")
});

function ComponentContainer(ui, el){
	this.SUPER( ui, el, ui?{className:"Component Flex FlexVStart FlexHStart " + ui.$Type}:null );

	if( ui && ui.$Components )
	{
		this.children = [];
		this.childIndex = {};

		for( var i=0, cui; cui=ui.$Components[i]; ++i )
		{
			if( !cui ) continue;
			var c = createComponent( cui );
			if( this.dom && c.dom ) 
				this.dom.appendChild( c.dom );

			c.parent = this;
			this.children.push(c);
			this.childIndex[ cui.$Name ] = c;

			for( var k in c.index )
				this.index[k] = c.index[k];
		}
	}
}
prepare(ComponentContainer, Component, {
calcMinSize:function(){
	var w=parseInt(this.Width || this.ui.Width) || 0;
	var h=parseInt(this.Height || this.ui.Height) || 0;

	if( (w != -2 || h != -2) && this.children )
	{
		for( var i=0, c; c=this.children[i]; ++i )
		{
			if( !c.dom || c.dom.style.display == "none" ) continue;

			if( c.__properties.Width === undefined || c.__properties.Height === undefined ) 
			{
				if( "Text" in c.ui || c.Text ) c.Text = c.Text;
				else if( c instanceof ComponentContainer ) c.calcMinSize();
			}
			var cw = parseInt(c.__properties.Width);
			var ch = parseInt(c.__properties.Height);
			if(w != -2 )
			{
				if( this.$Type == "HorizontalArrangement") w += cw;
				else if( w < cw ) w = cw;
			}
			if(h != -2)
			{
				if( this.$Type != "HorizontalArrangement") h += ch;
				else if( h < ch ) h = ch;
			}
		}
	}

	if( w != -2 ) w += "px";
	this.__properties.Width = w;
	if( h != -2 ) h += "px";
	this.__properties.Height = h;
},
$resize:function(w, h){
	if( !this.dom ) return;
	this.dom.style.width = w + "px";
	this.dom.style.height = h + "px";
	if( this.children )
	{
		var knownWidth = 0;
		var knownHeight = 0;
		var fullWidth = 0;
		var fullHeight = 0;
		var isVert = this.dom.className.indexOf("HorizontalArrangement") == -1;
		for( var i=0, c; c=this.children[i]; ++i )
		{
			if( !c.dom || c.dom.style.display == "none" ) continue;

			if( c.__properties.Width === undefined || c.__properties.Height === undefined ) c.calcMinSize();

			if( c.__properties.Width == -2 ) fullWidth++;
			else knownWidth += parseInt(c.__properties.Width) || 0;
			if( c.__properties.Height == -2 ) fullHeight++;
			else knownHeight += parseInt(c.__properties.Height) || 0;
		}

		if( isVert )
		{
			fullWidth = w;
			if( fullHeight )
			{
				fullHeight = (h - knownHeight) / fullHeight;
				knownHeight = h;
			}
		}
		else
		{
			fullHeight = h;
			if( fullWidth )
			{
				fullWidth = (w - knownWidth) / fullWidth;
				knownWidth = w;
			}
		}

		var acc=0;
		if( isVert )
		{
			if( this.AlignVertical == 3 ) acc += h/2 - knownHeight/2;
			else if( this.AlignVertical == 2 ) acc += h - knownHeight;
		}
		else
		{
			if( this.AlignHorizontal == 3 ) acc += w/2 - knownWidth/2;
			else if( this.AlignHorizontal == 2 ) acc += w - knownWidth;
		}
		for( var i=0, c; c=this.children[i]; ++i )
		{
			if( !c.dom || c.dom.style.display == "none" ) continue;

			var cw = parseInt(c.__properties.Width) || 0;
			var ch = parseInt(c.__properties.Height) || 0;
			if( cw == -2 ) cw = fullWidth;
			if( ch == -2 ) ch = fullHeight;
			c.$resize( cw, ch );
			if( c.dom )
			{
				if( isVert )
				{
					c.dom.style.top = acc + "px";
					acc += ch;
					if( this.AlignHorizontal==3 ) c.dom.style.left = (fullWidth/2 - cw/2) + "px";
					else if( this.AlignHorizontal == 2 ) c.dom.style.left = (fullWidth - cw) + "px";
				}
				else
				{
					c.dom.style.left = acc + "px";
					acc += cw;
				}
			}
		}
	}
},
get$$Components:0,
get$AlignHorizontal:0,
get$AlignVertical:0
});

function Dud( ui )
{
    Component.call(this, ui, "div");
    console.log( "DUD: " + JSON.stringify(ui) );
}
prepare(Dud, Component);

function createComponent( ui )
{
    if( !components[ui.$Type] )
    {
        console.error("Unknown type " + ui.$Type, ui);
        return new Dud(ui);
    }
    return new components[ui.$Type]( ui );
}

window.getComponentClass = function(ui){
    return components[ui.$Type];
}

window.renderUI = function( ui )
{
    return createComponent( ui.Properties );
};

})();
