package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

var db *sql.DB

type Notification struct {
	ID        int    `json:"id"`
	UserName  string `json:"user_name"`
	Message   string `json:"message"`
	Type      string `json:"type"`
	IsRead    bool   `json:"is_read"`
	CreatedAt string `json:"created_at"`
}

func connectDB() {
	host := os.Getenv("DB_HOST")
	if host == "" {
		host = "payment-db"
	}
	dbname := os.Getenv("DB_NAME")
	if dbname == "" {
		dbname = "payment_db"
	}
	user := os.Getenv("DB_USER")
	if user == "" {
		user = "payment_user"
	}
	password := os.Getenv("DB_PASSWORD")
	if password == "" {
		password = "payment_password"
	}

	connStr := fmt.Sprintf("host=%s port=5432 user=%s password=%s dbname=%s sslmode=disable",
		host, user, password, dbname)

	var err error
	for i := 1; i <= 20; i++ {
		db, err = sql.Open("postgres", connStr)
		if err == nil {
			if pingErr := db.Ping(); pingErr == nil {
				log.Println("Notification Service terhubung ke PostgreSQL")
				return
			}
		}
		log.Printf("Menunggu PostgreSQL... percobaan %d", i)
		time.Sleep(3 * time.Second)
	}
	log.Fatal("Gagal terhubung ke PostgreSQL")
}

func initDB() {
	_, err := db.Exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_name VARCHAR(100) NOT NULL,
            message TEXT NOT NULL,
            type VARCHAR(50) NOT NULL,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `)
	if err != nil {
		log.Fatal("Gagal buat tabel:", err)
	}
}

func main() {
	connectDB()
	initDB()

	r := gin.Default()

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"service": "notification-service", "status": "ok"})
	})

	r.GET("/notifications", func(c *gin.Context) {
		rows, err := db.Query(`SELECT id, user_name, message, type, is_read, created_at FROM notifications ORDER BY created_at DESC`)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var notifs []Notification
		for rows.Next() {
			var n Notification
			rows.Scan(&n.ID, &n.UserName, &n.Message, &n.Type, &n.IsRead, &n.CreatedAt)
			notifs = append(notifs, n)
		}
		c.JSON(200, gin.H{"service": "notification-service", "data": notifs})
	})

	r.POST("/notifications", func(c *gin.Context) {
		log.Println("POST /notifications received")
		
		body, err := io.ReadAll(c.Request.Body)
		if err != nil {
			log.Printf("Error reading body: %v", err)
			c.JSON(400, gin.H{"message": "user_name dan message wajib diisi"})
			return
		}
		log.Printf("Request body: %s", string(body))

		var rawBody map[string]interface{}
		err = json.Unmarshal(body, &rawBody)
		if err != nil {
			log.Printf("Error unmarshaling: %v", err)
			c.JSON(400, gin.H{"message": "user_name dan message wajib diisi"})
			return
		}

		userName, ok := rawBody["user_name"].(string)
		if !ok || userName == "" {
			log.Printf("Invalid user_name: %v", rawBody["user_name"])
			c.JSON(400, gin.H{"message": "user_name dan message wajib diisi"})
			return
		}

		message, ok := rawBody["message"].(string)
		if !ok || message == "" {
			log.Printf("Invalid message: %v", rawBody["message"])
			c.JSON(400, gin.H{"message": "user_name dan message wajib diisi"})
			return
		}

		notifType, _ := rawBody["type"].(string)
		if notifType == "" {
			notifType = "info"
		}

		log.Printf("Inserting: user=%s, msg=%s, type=%s", userName, message, notifType)

		var id int
		err = db.QueryRow(`INSERT INTO notifications (user_name, message, type) VALUES ($1,$2,$3) RETURNING id`,
			userName, message, notifType).Scan(&id)
		if err != nil {
			log.Printf("DB error: %v", err)
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}

		log.Printf("Inserted notification id=%d", id)
		c.JSON(http.StatusCreated, gin.H{"service": "notification-service",
			"message": "Notifikasi berhasil dikirim",
			"data": gin.H{"id": id, "user_name": userName,
				"message": message, "type": notifType}})
	})

	r.GET("/notifications/user/:name", func(c *gin.Context) {
		name := c.Param("name")
		rows, err := db.Query(`SELECT id, user_name, message, type, is_read, created_at FROM notifications WHERE user_name=$1 ORDER BY created_at DESC`, name)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()
		var notifs []Notification
		for rows.Next() {
			var n Notification
			rows.Scan(&n.ID, &n.UserName, &n.Message, &n.Type, &n.IsRead, &n.CreatedAt)
			notifs = append(notifs, n)
		}
		c.JSON(200, gin.H{"service": "notification-service", "data": notifs})
	})

	r.PUT("/notifications/:id/read", func(c *gin.Context) {
		id := c.Param("id")
		_, err := db.Exec("UPDATE notifications SET is_read=true WHERE id=$1", id)
		if err != nil {
			c.JSON(500, gin.H{"error": err.Error()})
			return
		}
		c.JSON(200, gin.H{"service": "notification-service", "message": "Notifikasi ditandai dibaca"})
	})

	log.Println("Starting notification service on :3004")
	r.Run(":3004")
}
